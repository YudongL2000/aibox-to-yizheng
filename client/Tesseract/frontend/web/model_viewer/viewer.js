/*
 * [INPUT]: 依赖 three.js、OrbitControls、TransformControls、GLTFLoader 与 Flutter host 的 postMessage 协议，并消费 JSON-safe 的字符串/对象消息。
 * [OUTPUT]: 对外提供多模型 3D viewer，支持只读展示与可编辑两种模式下的位姿同步、运行时缩放、灯光调节、滚轮缩放安全边界与 viewerReady/transforms 的诊断日志。
 * [POS]: web/model_viewer 的核心渲染端，被 model_3d_viewer.dart 通过 iframe 协议驱动；当 `drag=false` 时退化成纯数字孪生展示层。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const VIEWER_SOURCE = "digital-twin-viewer";
const HOST_SOURCE = "flutter-digital-twin";
const PROTOCOL_VERSION = 1;
const DEGREE = 180 / Math.PI;
const RADIAN = Math.PI / 180;

const overlay = document.getElementById("overlay");
const errorEl = document.getElementById("error");
const hintEl = document.getElementById("drag-hint");

function showError(message) {
  errorEl.style.display = "block";
  errorEl.textContent = message;
}

function getUrl() {
  return new URL(window.location.href);
}

function getQueryParam(name) {
  return getUrl().searchParams.get(name);
}

function getQueryValues(name) {
  return getUrl().searchParams.getAll(name).filter(Boolean);
}

function getFileUrls() {
  const multiple = getQueryValues("file");
  if (multiple.length > 0) {
    return multiple.map((item) => decodeURIComponent(item));
  }
  const filesParam = getQueryParam("files");
  if (filesParam) {
    return filesParam
      .split("|")
      .map((item) => decodeURIComponent(item.trim()))
      .filter(Boolean);
  }
  const single = getQueryParam("file");
  return single ? [decodeURIComponent(single)] : [];
}

function parseVectorMatrix(name) {
  const raw = getQueryParam(name);
  if (!raw) return null;
  const rows = raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  if (rows.length === 0) return null;
  return rows.map((row) => {
    const values = row.split(",").map((item) => Number.parseFloat(item.trim()));
    if (values.length < 3 || values.some((item) => Number.isNaN(item))) {
      return null;
    }
    return values.slice(0, 3);
  });
}

function getModelIds(count) {
  const ids = getQueryValues("id").map((item) => decodeURIComponent(item));
  if (ids.length === count) {
    return ids;
  }
  return Array.from({ length: count }, (_, index) => `model_${index + 1}`);
}

function toRadians(value) {
  return Number(value || 0) * RADIAN;
}

function toDegrees(value) {
  return Number(value || 0) * DEGREE;
}

function round3(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function clampMin(value, minValue) {
  return Math.max(Number.isFinite(value) ? value : minValue, minValue);
}

function normalizeHexColor(value, fallback = "#0A0E1A") {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(normalized)) {
    return fallback;
  }
  return `#${normalized}`;
}

function vectorToPayload(vector) {
  return {
    x: round3(vector.x),
    y: round3(vector.y),
    z: round3(vector.z),
  };
}

function rotationToPayload(rotation) {
  return {
    x: round3(toDegrees(rotation.x)),
    y: round3(toDegrees(rotation.y)),
    z: round3(toDegrees(rotation.z)),
  };
}

function scaleToPayload(scale) {
  return {
    x: round3(scale.x),
    y: round3(scale.y),
    z: round3(scale.z),
  };
}

function postToHost(channel, type, payload = {}) {
  const message = {
    source: VIEWER_SOURCE,
    version: PROTOCOL_VERSION,
    channel,
    type,
    ...payload,
  };
  const serialized = JSON.stringify(message);
  const targets = [];
  if (window.parent && window.parent !== window) {
    targets.push(window.parent);
  }
  if (window.top && window.top !== window && !targets.includes(window.top)) {
    targets.push(window.top);
  }
  if (targets.length === 0) {
    console.warn("[DigitalTwin][Viewer] postToHost skipped (no parent frame)", {
      channel,
      type,
    });
    return;
  }
  console.info("[DigitalTwin][Viewer] postToHost", {
    channel,
    type,
    modelCount: payload?.modelCount ?? null,
  });
  for (const target of targets) {
    try {
      target.postMessage(serialized, "*");
    } catch (error) {
      console.warn("[DigitalTwin][Viewer] postMessage failed", error);
    }
  }
}

function normalizeHostMessage(raw) {
  if (typeof raw === "string" && raw.trim()) {
    try {
      return normalizeHostMessage(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }
  return null;
}

function fitCameraToObject(camera, controls, object, offset = 1.25) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const fov = (camera.fov * Math.PI) / 180;
  let cameraZ = Math.abs((maxSize / 2) / Math.tan(fov / 2));
  cameraZ *= offset;

  camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);

  controls.target.copy(center);
  configureOrbitBounds(camera, controls, size, cameraZ);
  updateCameraClipping(camera, controls, size);
  controls.update();
}

function configureOrbitBounds(camera, controls, sceneSize, fittedDistance) {
  const maxSize = Math.max(sceneSize.x, sceneSize.y, sceneSize.z, 0.1);
  const minDistance = Math.max(maxSize * 0.18, 0.25);
  const maxDistance = Math.max(fittedDistance * 12, maxSize * 30, minDistance + 10);
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
}

function updateCameraClipping(camera, controls, sceneSize) {
  const maxSize = Math.max(sceneSize.x, sceneSize.y, sceneSize.z, 0.1);
  const distance = camera.position.distanceTo(controls.target);
  const nextNear = Math.max(Math.min(distance * 0.02, maxSize * 0.5), 0.01);
  const nextFar = Math.max(distance + maxSize * 20, maxSize * 60, 100);

  if (
    Math.abs(camera.near - nextNear) > 0.0001 ||
    Math.abs(camera.far - nextFar) > 0.01
  ) {
    camera.near = nextNear;
    camera.far = nextFar;
    camera.updateProjectionMatrix();
  }
}

function getSceneBounds(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) {
    return {
      size: new THREE.Vector3(1, 1, 1),
      center: new THREE.Vector3(0, 0, 0),
    };
  }
  return {
    size: box.getSize(new THREE.Vector3()),
    center: box.getCenter(new THREE.Vector3()),
  };
}

function normalizeModelSize(model, targetSize = 1) {
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  if (maxSize <= 0) return;
  const scale = targetSize / maxSize;
  model.scale.multiplyScalar(scale);
}

function getModelPosition(layout, index, count, spacing) {
  if (layout === "center" || count <= 1) return [0, 0, 0];
  if (layout === "row") {
    const offset = (index - (count - 1) / 2) * spacing;
    return [offset, 0, 0];
  }
  if (layout === "grid") {
    const cols = Math.ceil(Math.sqrt(count));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const centerX = (cols - 1) / 2;
    const centerZ = (Math.ceil(count / cols) - 1) / 2;
    return [(col - centerX) * spacing, 0, (row - centerZ) * spacing];
  }
  return [0, 0, 0];
}

function createWrapper(model, position, rotation, index, modelId) {
  const wrapper = new THREE.Group();
  wrapper.name = modelId;
  wrapper.userData.modelIndex = index;
  wrapper.userData.modelId = modelId;
  wrapper.userData.contentModel = model;
  wrapper.userData.hitBox = null;
  wrapper.userData.scale = { x: 1, y: 1, z: 1 };

  const box = new THREE.Box3().setFromObject(model);
  if (!box.isEmpty()) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const hitBox = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 1.04, size.y * 1.04, size.z * 1.04),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    hitBox.userData.wrapperId = modelId;
    wrapper.userData.hitBox = hitBox;
    wrapper.add(hitBox);
  }

  wrapper.add(model);
  wrapper.position.set(position[0], position[1], position[2]);
  wrapper.rotation.set(
    toRadians(rotation[0]),
    toRadians(rotation[1]),
    toRadians(rotation[2])
  );
  return wrapper;
}

function getWrapperScale(wrapper) {
  const scale = wrapper?.userData?.scale;
  return {
    x: typeof scale?.x === "number" ? scale.x : 1,
    y: typeof scale?.y === "number" ? scale.y : 1,
    z: typeof scale?.z === "number" ? scale.z : 1,
  };
}

function applyWrapperScale(wrapper, update = {}) {
  const model = wrapper?.userData?.contentModel;
  const baseScale = model?.userData?.baseScale;
  if (!model || !baseScale) return;

  const currentScale = getWrapperScale(wrapper);
  const nextScale = {
    x: typeof update.x === "number" ? Math.max(update.x, 0.05) : currentScale.x,
    y: typeof update.y === "number" ? Math.max(update.y, 0.05) : currentScale.y,
    z: typeof update.z === "number" ? Math.max(update.z, 0.05) : currentScale.z,
  };

  model.scale.set(
    baseScale.x * nextScale.x,
    baseScale.y * nextScale.y,
    baseScale.z * nextScale.z
  );
  if (wrapper.userData.hitBox) {
    wrapper.userData.hitBox.scale.set(nextScale.x, nextScale.y, nextScale.z);
  }
  wrapper.userData.scale = nextScale;
  wrapper.updateMatrixWorld(true);
}

function mapAssetsModelsPathToBundlePath(pathname) {
  const match = /^\/assets\/models\/(.+)$/i.exec(pathname);
  if (match) {
    return `/assets/assets/models/${match[1]}`;
  }
  return pathname;
}

/**
 * 将场景里的模型 URL 解析为可 fetch 的绝对地址。
 * iframe 位于 /model_viewer/，若传入无 leading slash 的相对路径，浏览器会误解析到 /model_viewer/... 导致 404。
 * Flutter Web 将 pubspec 的 assets/models 发布到 /assets/assets/models/；模板里常见的 /assets/models/ 会 404，在此纠正。
 */
function resolveModelUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return fileUrl;
  const trimmed = fileUrl.trim();
  if (!trimmed) return trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      const nextPath = mapAssetsModelsPathToBundlePath(u.pathname);
      if (nextPath !== u.pathname) {
        u.pathname = nextPath;
      }
      return u.toString();
    }
    const u = trimmed.startsWith("/")
      ? new URL(trimmed, window.location.origin)
      : new URL(trimmed, `${window.location.origin}/`);
    const nextPath = mapAssetsModelsPathToBundlePath(u.pathname);
    if (nextPath !== u.pathname) {
      u.pathname = nextPath;
    }
    return u.href;
  } catch (_) {
    return trimmed;
  }
}

async function loadGltfModel(fileUrl) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      fileUrl,
      (gltf) => resolve(gltf.scene || gltf.scenes[0]),
      undefined,
      (error) => reject(error)
    );
  });
}

async function main() {
  const channel = getQueryParam("channel") || "default";
  const fileUrls = getFileUrls();
  if (fileUrls.length === 0) {
    showError('Missing "file" or "files" query parameter.');
    postToHost(channel, "viewerError", {
      message: 'Missing "file" or "files" query parameter.',
    });
    return;
  }
  const layout = getQueryParam("layout") || "center";
  const spacing = Number.parseFloat(getQueryParam("spacing") || "1.5") || 1.5;
  const editable = getQueryParam("drag") !== "false";
  const customPositions = parseVectorMatrix("pos");
  const customRotations = parseVectorMatrix("rot");
  const customScales = parseVectorMatrix("scl");
  const modelIds = getModelIds(fileUrls.length);

  const container = document.getElementById("app");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.01,
    100000
  );
  camera.position.set(3, 3, 3);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.zoomSpeed = 0.01;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
  scene.add(keyLight);

  const lightingState = {
    backgroundColor: "#0A0E1A",
    ambientIntensity: 0.65,
    keyLightIntensity: 0.95,
    keyLightPosition: { x: 5, y: 10, z: 7 },
  };

  function applyLighting(update = {}) {
    const keyLightPosition = update.keyLightPosition || {};
    lightingState.backgroundColor = normalizeHexColor(
      update.backgroundColor,
      lightingState.backgroundColor
    );
    lightingState.ambientIntensity = clampMin(
      update.ambientIntensity,
      lightingState.ambientIntensity
    );
    lightingState.keyLightIntensity = clampMin(
      update.keyLightIntensity,
      lightingState.keyLightIntensity
    );
    lightingState.keyLightPosition = {
      x:
        typeof keyLightPosition.x === "number"
          ? keyLightPosition.x
          : lightingState.keyLightPosition.x,
      y:
        typeof keyLightPosition.y === "number"
          ? keyLightPosition.y
          : lightingState.keyLightPosition.y,
      z:
        typeof keyLightPosition.z === "number"
          ? keyLightPosition.z
          : lightingState.keyLightPosition.z,
    };

    scene.background = new THREE.Color(lightingState.backgroundColor);
    ambientLight.intensity = lightingState.ambientIntensity;
    keyLight.intensity = lightingState.keyLightIntensity;
    keyLight.position.set(
      lightingState.keyLightPosition.x,
      lightingState.keyLightPosition.y,
      lightingState.keyLightPosition.z
    );
  }

  applyLighting();

  const modelsGroup = new THREE.Group();
  scene.add(modelsGroup);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const wrappers = [];
  let sceneBounds = getSceneBounds(modelsGroup);
  let selectedWrapper = null;
  let selectionHelper = null;
  let interactionMode = "translate";
  let pointerDown = null;

  const transformControls = editable
    ? new TransformControls(camera, renderer.domElement)
    : null;
  if (transformControls) {
    transformControls.setSpace("world");
    transformControls.setMode(interactionMode);
    transformControls.size = 0.85;
    transformControls.enabled = true;
    scene.add(transformControls);
  }

  function clearSelectionHelper() {
    if (selectionHelper) {
      scene.remove(selectionHelper);
      selectionHelper.geometry.dispose();
      selectionHelper.material.dispose();
      selectionHelper = null;
    }
  }

  function refreshSelectionHelper() {
    if (!editable || !selectedWrapper) {
      clearSelectionHelper();
      return;
    }
    clearSelectionHelper();
    selectionHelper = new THREE.BoxHelper(selectedWrapper, 0x00d9ff);
    scene.add(selectionHelper);
  }

  function getWorldTransform(wrapper) {
    // 协议统一回传预览窗口全局坐标系下的绝对位姿，避免父节点变换泄漏到 host。
    wrapper.updateMatrixWorld(true);
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldEuler = new THREE.Euler();
    wrapper.getWorldPosition(worldPosition);
    wrapper.getWorldQuaternion(worldQuaternion);
    worldEuler.setFromQuaternion(worldQuaternion, "XYZ");
    return { worldPosition, worldEuler };
  }

  function wrapperToPayload(wrapper) {
    const { worldPosition, worldEuler } = getWorldTransform(wrapper);
  return {
    index: wrapper.userData.modelIndex,
    modelId: wrapper.userData.modelId,
    position: vectorToPayload(worldPosition),
    rotation: rotationToPayload(worldEuler),
    scale: scaleToPayload(getWrapperScale(wrapper)),
  };
}

  function emitTransforms() {
    postToHost(channel, "transformsChanged", {
      selectedModelId: selectedWrapper?.userData?.modelId || null,
      models: wrappers.map(wrapperToPayload),
    });
  }

  function emitSelection() {
    postToHost(channel, "selectionChanged", {
      modelId: selectedWrapper?.userData?.modelId || null,
    });
  }

  function setSelection(wrapper) {
    selectedWrapper = editable ? wrapper || null : null;
    refreshSelectionHelper();
    if (transformControls && selectedWrapper && editable) {
      transformControls.attach(selectedWrapper);
    } else {
      transformControls?.detach();
    }
    emitSelection();
    emitTransforms();
  }

  function findWrapper(target) {
    let current = target;
    while (current) {
      if (current.userData && current.userData.modelId) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  function applyTransformUpdate(update) {
    if (!update) return;
    const wrapper = wrappers.find((item) => {
      if (update.modelId && item.userData.modelId === update.modelId) {
        return true;
      }
      return Number.isInteger(update.index) && item.userData.modelIndex === update.index;
    });
    if (!wrapper) return;

    const { worldPosition, worldEuler } = getWorldTransform(wrapper);

    if (update.position) {
      // host 下发的是绝对 world position，进入 wrapper 前先转换回父节点局部坐标。
      const nextWorldPosition = new THREE.Vector3(
        typeof update.position.x === "number" ? update.position.x : worldPosition.x,
        typeof update.position.y === "number" ? update.position.y : worldPosition.y,
        typeof update.position.z === "number" ? update.position.z : worldPosition.z
      );
      if (wrapper.parent) {
        wrapper.parent.updateMatrixWorld(true);
        wrapper.position.copy(wrapper.parent.worldToLocal(nextWorldPosition));
      } else {
        wrapper.position.copy(nextWorldPosition);
      }
    }
    if (update.rotation) {
      // host 下发的是绝对 world rotation，先还原成 local quaternion 再写回 wrapper。
      const nextWorldEuler = new THREE.Euler(
        typeof update.rotation.x === "number"
          ? toRadians(update.rotation.x)
          : worldEuler.x,
        typeof update.rotation.y === "number"
          ? toRadians(update.rotation.y)
          : worldEuler.y,
        typeof update.rotation.z === "number"
          ? toRadians(update.rotation.z)
          : worldEuler.z,
        "XYZ"
      );
      const nextWorldQuaternion = new THREE.Quaternion().setFromEuler(
        nextWorldEuler
      );
      if (wrapper.parent) {
        wrapper.parent.updateMatrixWorld(true);
        const parentWorldQuaternion = new THREE.Quaternion();
        wrapper.parent.getWorldQuaternion(parentWorldQuaternion);
        const nextLocalQuaternion = parentWorldQuaternion
          .clone()
          .invert()
          .multiply(nextWorldQuaternion);
        wrapper.quaternion.copy(nextLocalQuaternion);
      } else {
        wrapper.quaternion.copy(nextWorldQuaternion);
      }
    }
    if (update.scale) {
      applyWrapperScale(wrapper, update.scale);
    }
    wrapper.updateMatrixWorld(true);
    sceneBounds = getSceneBounds(modelsGroup);
    configureOrbitBounds(
      camera,
      controls,
      sceneBounds.size,
      camera.position.distanceTo(controls.target)
    );
    updateCameraClipping(camera, controls, sceneBounds.size);
  }

  function setInteractionMode(mode) {
    interactionMode = mode === "rotate" ? "rotate" : "translate";
    transformControls?.setMode(interactionMode);
    if (hintEl) {
      hintEl.textContent =
        interactionMode === "rotate"
          ? "已进入旋转模式 · 拖动圆环调整角度"
          : "已进入平移模式 · 拖动箭头调整位置";
    }
  }

  if (editable) {
    renderer.domElement.addEventListener("pointerdown", (event) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    });

    renderer.domElement.addEventListener("pointerup", (event) => {
      if (!pointerDown || transformControls?.dragging) return;
      const dx = Math.abs(pointerDown.x - event.clientX);
      const dy = Math.abs(pointerDown.y - event.clientY);
      pointerDown = null;
      if (dx > 4 || dy > 4) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(modelsGroup.children, true)[0];
      const wrapper = hit ? findWrapper(hit.object) : null;
      if (wrapper) {
        setSelection(wrapper);
      }
    });

    transformControls?.addEventListener("dragging-changed", (event) => {
      controls.enabled = !event.value;
    });
    transformControls?.addEventListener("objectChange", () => {
      refreshSelectionHelper();
      sceneBounds = getSceneBounds(modelsGroup);
      updateCameraClipping(camera, controls, sceneBounds.size);
      emitTransforms();
    });
    transformControls?.addEventListener("mouseUp", () => {
      emitTransforms();
    });
  }

  window.addEventListener("message", (event) => {
    const data = normalizeHostMessage(event.data);
    if (!data || data.source !== HOST_SOURCE || data.channel !== channel) {
      return;
    }
    console.info("[DigitalTwin][Viewer] host message", {
      channel,
      type: data.type || null,
    });
    switch (data.type) {
      case "setTransforms": {
        const models = Array.isArray(data.models) ? data.models : [];
        console.info("[DigitalTwin][Viewer] apply transforms", {
          channel,
          modelCount: models.length,
          modelIds: models.map((item) => item?.modelId).filter(Boolean),
        });
        models.forEach(applyTransformUpdate);
        refreshSelectionHelper();
        emitTransforms();
        break;
      }
      case "selectModel": {
        if (!editable) {
          break;
        }
        const modelId = typeof data.modelId === "string" ? data.modelId : "";
        const wrapper = wrappers.find((item) => item.userData.modelId === modelId) || null;
        if (wrapper) {
          setSelection(wrapper);
        }
        break;
      }
      case "setInteractionMode":
        if (!editable) {
          break;
        }
        setInteractionMode(data.mode);
        break;
      case "setLighting":
        applyLighting({
          backgroundColor: data.backgroundColor,
          ambientIntensity: data.ambientIntensity,
          keyLightIntensity: data.keyLightIntensity,
          keyLightPosition: data.keyLightPosition,
        });
        break;
      case "requestSnapshot":
        emitSelection();
        emitTransforms();
        break;
      default:
        break;
    }
  });

  try {
    for (let index = 0; index < fileUrls.length; index += 1) {
      const model = await loadGltfModel(resolveModelUrl(fileUrls[index]));
      normalizeModelSize(model, 1);
      model.userData.baseScale = model.scale.clone();
      const scale =
        customScales && customScales[index] ? customScales[index] : [1, 1, 1];
      const position =
        customPositions && customPositions[index]
          ? customPositions[index]
          : getModelPosition(layout, index, fileUrls.length, spacing);
      const rotation =
        customRotations && customRotations[index]
          ? customRotations[index]
          : [0, 0, 0];
      const wrapper = createWrapper(model, position, rotation, index, modelIds[index]);
      applyWrapperScale(wrapper, {
        x: scale[0],
        y: scale[1],
        z: scale[2],
      });
      wrappers.push(wrapper);
      modelsGroup.add(wrapper);
    }

    sceneBounds = getSceneBounds(modelsGroup);
    fitCameraToObject(camera, controls, modelsGroup, 1.3);
    if (editable) {
      setInteractionMode(interactionMode);
      setSelection(wrappers[0] || null);
    } else {
      clearSelectionHelper();
      selectedWrapper = null;
    }
    overlay.style.display = "none";
    if (hintEl) {
      hintEl.style.display = editable ? "block" : "none";
      if (editable) {
        hintEl.textContent = "点击组件选中 · 面板可切换平移/旋转模式";
      }
    }

    postToHost(channel, "viewerReady", {
      selectedModelId: selectedWrapper?.userData?.modelId || null,
      modelCount: wrappers.length,
    });
    console.info("[DigitalTwin][Viewer] scene ready", {
      channel,
      modelCount: wrappers.length,
      modelIds: wrappers.map((item) => item.userData?.modelId).filter(Boolean),
    });
    emitTransforms();
  } catch (error) {
    overlay.style.display = "flex";
    const detail = String(error?.stack || error);
    showError(detail);
    postToHost(channel, "viewerError", {
      message: String(error?.message || error || "viewer failed"),
    });
    return;
  }

  function onResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updateCameraClipping(camera, controls, sceneBounds.size);
  }

  window.addEventListener("resize", onResize);

  function animate() {
    controls.update();
    updateCameraClipping(camera, controls, sceneBounds.size);
    if (selectionHelper) {
      selectionHelper.update();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

main();
