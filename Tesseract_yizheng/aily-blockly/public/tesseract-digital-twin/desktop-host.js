const VIEWER_SOURCE = "digital-twin-viewer";
const VIEWER_HOST_SOURCE = "flutter-digital-twin";
const VIEWER_CHANNEL = "desktop-digital-twin-viewer";

const viewerFrame = document.getElementById("viewer-frame");
const overlay = document.getElementById("overlay");
const statusTitle = document.getElementById("status-title");
const statusCopy = document.getElementById("status-copy");

const state = {
  revision: null,
  currentEnvelope: null,
  previewEnvelope: null,
  assetSignature: "",
  transformSignature: "",
  modelIds: [],
  viewerReady: false,
  resolverConfig: {
    interfacePresets: {},
    mountProfiles: {},
    portComponentOverrides: {},
  },
};

loadResolverConfig()
  .then((config) => {
    state.resolverConfig = config;
    if (state.currentEnvelope) {
      applySceneEnvelope(state.currentEnvelope);
    }
  })
  .catch((error) => {
    console.warn("[DigitalTwin][DesktopHost] failed to load resolver config", error);
  });

function normalizePayload(raw) {
  if (typeof raw === "string" && raw.trim()) {
    try {
      return normalizePayload(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }

  return null;
}

function extractEnvelope(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.envelope && typeof payload.envelope === "object") {
    return payload.envelope;
  }
  if (payload.sceneEnvelope && typeof payload.sceneEnvelope === "object") {
    return payload.sceneEnvelope;
  }
  return payload;
}

function extractScene(envelope) {
  if (envelope && typeof envelope === "object" && envelope.scene && typeof envelope.scene === "object") {
    return envelope.scene;
  }
  return envelope;
}

function asVector(raw, fallback = [0, 0, 0]) {
  if (Array.isArray(raw)) {
    return [
      Number(raw[0] ?? fallback[0]) || fallback[0],
      Number(raw[1] ?? fallback[1]) || fallback[1],
      Number(raw[2] ?? fallback[2]) || fallback[2],
    ];
  }

  if (raw && typeof raw === "object") {
    return [
      Number(raw.x ?? fallback[0]) || fallback[0],
      Number(raw.y ?? fallback[1]) || fallback[1],
      Number(raw.z ?? fallback[2]) || fallback[2],
    ];
  }

  return [...fallback];
}

function asRecord(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }
  return null;
}

function hasAnyKey(record, keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

function readString(record, keys, fallback = "") {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const value = String(record[key] ?? "").trim();
      if (value) {
        return value;
      }
    }
  }
  return fallback;
}

function buildAssetUrl(pathname) {
  try {
    return new URL(pathname, window.location.href).toString();
  } catch {
    return pathname;
  }
}

async function fetchJsonConfig(pathname) {
  try {
    const response = await fetch(buildAssetUrl(pathname), { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return normalizePayload(await response.text());
  } catch (error) {
    console.warn("[DigitalTwin][DesktopHost] config fetch failed", pathname, error);
    return null;
  }
}

function looksLikeMountProfileMap(record) {
  if (Object.keys(record).length === 0) {
    return true;
  }
  return Object.values(record).some((value) => {
    const item = asRecord(value);
    return (
      item &&
      hasAnyKey(item, [
        "position",
        "rotation",
        "scale",
        "mount_position_offset",
        "mount_rotation_offset",
        "mount_scale",
      ])
    );
  });
}

function looksLikePortComponentOverrideMap(record) {
  if (Object.keys(record).length === 0) {
    return true;
  }
  return Object.values(record).some((value) => {
    const portMap = asRecord(value);
    if (!portMap) {
      return false;
    }
    return Object.values(portMap).some((overrideValue) => {
      const override = asRecord(overrideValue);
      return (
        override &&
        hasAnyKey(override, [
          "position",
          "rotation",
          "residual_position",
          "residual_rotation",
        ])
      );
    });
  });
}

function pickNestedRecord(record, keys, predicate) {
  if (predicate(record)) {
    return record;
  }
  for (const key of keys) {
    const nested = asRecord(record[key]);
    if (nested && predicate(nested)) {
      return nested;
    }
  }
  return {};
}

function extractMountProfiles(raw) {
  const record = asRecord(raw);
  if (!record) {
    return {};
  }
  return pickNestedRecord(
    record,
    [
      "mount_profiles",
      "mountProfiles",
      "digital_twin_mount_profiles",
      "digitalTwinMountProfiles",
      "mount_compensation",
      "mountCompensation",
      "digital_twin_mount_compensation",
      "digitalTwinMountCompensation",
      "models",
    ],
    looksLikeMountProfileMap
  );
}

function extractPortComponentOverrides(raw) {
  const record = asRecord(raw);
  if (!record) {
    return {};
  }
  return pickNestedRecord(
    record,
    [
      "port_component_overrides",
      "portComponentOverrides",
      "digital_twin_port_component_overrides",
      "digitalTwinPortComponentOverrides",
      "overrides",
    ],
    looksLikePortComponentOverrideMap
  );
}

function extractInterfacePresets(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const result = {};
  for (const item of list) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const id = readString(record, ["id"]);
    if (!id) {
      continue;
    }
    result[id] = {
      id,
      position: asVector(record.position),
      rotation: asVector(record.rotation),
    };
  }
  return result;
}

async function loadResolverConfig() {
  const [interfacesRaw, mountProfilesRaw, portOverridesRaw] = await Promise.all([
    fetchJsonConfig("../assets/assets/config/digital_twin_interfaces.json"),
    fetchJsonConfig("../assets/assets/config/digital_twin_mount_profiles.json"),
    fetchJsonConfig("../assets/assets/config/digital_twin_port_component_overrides.json"),
  ]);

  return {
    interfacePresets: extractInterfacePresets(
      asRecord(interfacesRaw)?.interfaces ?? interfacesRaw
    ),
    mountProfiles: extractMountProfiles(mountProfilesRaw),
    portComponentOverrides: extractPortComponentOverrides(portOverridesRaw),
  };
}

function readInterfaceId(record) {
  return readString(record, ["interface_id", "interfaceId"]);
}

function readMountPositionOffset(record, mountProfile) {
  if (
    hasAnyKey(record, ["mount_position_offset", "mountPositionOffset"])
  ) {
    return asVector(record.mount_position_offset ?? record.mountPositionOffset);
  }
  return asVector(
    mountProfile?.position ?? mountProfile?.mount_position_offset,
    [0, 0, 0]
  );
}

function readMountRotationOffset(record, mountProfile) {
  if (
    hasAnyKey(record, ["mount_rotation_offset", "mountRotationOffset"])
  ) {
    return asVector(record.mount_rotation_offset ?? record.mountRotationOffset);
  }
  return asVector(
    mountProfile?.rotation ?? mountProfile?.mount_rotation_offset,
    [0, 0, 0]
  );
}

function readScale(record, mountProfile) {
  if (hasAnyKey(record, ["scale", "scl"])) {
    return asVector(record.scale ?? record.scl, [1, 1, 1]);
  }
  return asVector(mountProfile?.scale ?? mountProfile?.mount_scale, [1, 1, 1]);
}

function normalizeSceneModel(item, index, mountProfiles) {
  const record = asRecord(item);
  if (!record) {
    return null;
  }
  const id = readString(record, ["id"], `model_${index + 1}`);
  const mountProfile = asRecord(mountProfiles[id]) || {};
  return {
    id,
    url: String(record.url ?? "").trim(),
    interfaceId: readInterfaceId(record),
    position: asVector(record.position ?? record.pos),
    rotation: asVector(record.rotation ?? record.rot),
    scale: readScale(record, mountProfile),
    mountPositionOffset: readMountPositionOffset(record, mountProfile),
    mountRotationOffset: readMountRotationOffset(record, mountProfile),
  };
}

function normalizePortComponentOverride(record) {
  const override = asRecord(record);
  if (!override) {
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };
  }
  return {
    position: asVector(
      override.position ?? override.residual_position,
      [0, 0, 0]
    ),
    rotation: asVector(
      override.rotation ?? override.residual_rotation,
      [0, 0, 0]
    ),
  };
}

function lookupPortComponentOverride(overrides, interfaceId, modelId) {
  if (!interfaceId || !modelId) {
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };
  }
  return normalizePortComponentOverride(
    asRecord(overrides?.[interfaceId])?.[modelId]
  );
}

function composeMountOffset({
  mountProfilePosition,
  portResidualPosition = [0, 0, 0],
}) {
  return [
    mountProfilePosition[0] + portResidualPosition[0],
    mountProfilePosition[1] + portResidualPosition[1],
    mountProfilePosition[2] + portResidualPosition[2],
  ];
}

function composeLocalPosition({
  anchorPosition,
  anchorRotation,
  mountProfilePosition,
  portResidualPosition = [0, 0, 0],
}) {
  const combinedCompensation = composeMountOffset({
    mountProfilePosition,
    portResidualPosition,
  });
  const rotatedCompensation = rotateVector(
    combinedCompensation,
    anchorRotation
  );
  return [
    anchorPosition[0] + rotatedCompensation[0],
    anchorPosition[1] + rotatedCompensation[1],
    anchorPosition[2] + rotatedCompensation[2],
  ];
}

function scaleVector(vector, scale) {
  return [
    vector[0] * scale[0],
    vector[1] * scale[1],
    vector[2] * scale[2],
  ];
}

function composePosition({
  basePosition,
  baseRotation,
  localPosition,
  localScale = [1, 1, 1],
}) {
  const scaledLocalPosition = scaleVector(localPosition, localScale);
  const rotated = rotateVector(scaledLocalPosition, baseRotation);
  return [
    basePosition[0] + rotated[0],
    basePosition[1] + rotated[1],
    basePosition[2] + rotated[2],
  ];
}

function composeLocalRotation({
  anchorRotation,
  mountProfileRotation,
  portResidualRotation = [0, 0, 0],
}) {
  return composeRotation({
    baseRotation: anchorRotation,
    localRotation: composeRotation({
      baseRotation: mountProfileRotation,
      localRotation: portResidualRotation,
    }),
  });
}

function composeRotation({ baseRotation, localRotation }) {
  return quaternionFromEulerDegrees(baseRotation)
    .multiply(quaternionFromEulerDegrees(localRotation))
    .toEulerDegrees();
}

function rotateVector(vector, rotation) {
  return quaternionFromEulerDegrees(rotation).rotateVector(vector);
}

function degToRad(value) {
  return (Number(value) || 0) * (Math.PI / 180);
}

function radToDeg(value) {
  return value * (180 / Math.PI);
}

function normalizeEulerDegrees(vector) {
  return vector.map((value) => {
    let degrees = radToDeg(value);
    if (!Number.isFinite(degrees)) {
      return 0;
    }
    degrees = ((degrees + 180) % 360 + 360) % 360 - 180;
    return Math.abs(degrees) < 0.000001 ? 0 : degrees;
  });
}

function quaternionFromEulerDegrees(rotation) {
  const rx = degToRad(rotation[0] ?? 0);
  const ry = degToRad(rotation[1] ?? 0);
  const rz = degToRad(rotation[2] ?? 0);

  const cx = Math.cos(rx * 0.5);
  const sx = Math.sin(rx * 0.5);
  const cy = Math.cos(ry * 0.5);
  const sy = Math.sin(ry * 0.5);
  const cz = Math.cos(rz * 0.5);
  const sz = Math.sin(rz * 0.5);

  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz + sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
    multiply(other) {
      return quaternionFromComponents(
        this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
        this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
        this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
        this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z
      );
    },
    rotateVector(vector) {
      const pure = quaternionFromComponents(vector[0], vector[1], vector[2], 0);
      const conjugate = quaternionFromComponents(-this.x, -this.y, -this.z, this.w);
      const rotated = this.multiply(pure).multiply(conjugate);
      return [rotated.x, rotated.y, rotated.z];
    },
    toEulerDegrees() {
      const sinrCosp = 2 * (this.w * this.x + this.y * this.z);
      const cosrCosp = 1 - 2 * (this.x * this.x + this.y * this.y);
      const roll = Math.atan2(sinrCosp, cosrCosp);

      const sinp = 2 * (this.w * this.y - this.z * this.x);
      const pitch =
        Math.abs(sinp) >= 1
          ? Math.sign(sinp) * Math.PI / 2
          : Math.asin(sinp);

      const sinyCosp = 2 * (this.w * this.z + this.x * this.y);
      const cosyCosp = 1 - 2 * (this.y * this.y + this.z * this.z);
      const yaw = Math.atan2(sinyCosp, cosyCosp);

      return normalizeEulerDegrees([roll, pitch, yaw]);
    },
  };
}

function quaternionFromComponents(x, y, z, w) {
  return {
    x,
    y,
    z,
    w,
    multiply(other) {
      return quaternionFromComponents(
        this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
        this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
        this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w,
        this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z
      );
    },
    rotateVector(vector) {
      const pure = quaternionFromComponents(vector[0], vector[1], vector[2], 0);
      const conjugate = quaternionFromComponents(-this.x, -this.y, -this.z, this.w);
      const rotated = this.multiply(pure).multiply(conjugate);
      return [rotated.x, rotated.y, rotated.z];
    },
    toEulerDegrees() {
      const sinrCosp = 2 * (this.w * this.x + this.y * this.z);
      const cosrCosp = 1 - 2 * (this.x * this.x + this.y * this.y);
      const roll = Math.atan2(sinrCosp, cosrCosp);

      const sinp = 2 * (this.w * this.y - this.z * this.x);
      const pitch =
        Math.abs(sinp) >= 1
          ? Math.sign(sinp) * Math.PI / 2
          : Math.asin(sinp);

      const sinyCosp = 2 * (this.w * this.z + this.x * this.y);
      const cosyCosp = 1 - 2 * (this.y * this.y + this.z * this.z);
      const yaw = Math.atan2(sinyCosp, cosyCosp);

      return normalizeEulerDegrees([roll, pitch, yaw]);
    },
  };
}

function resolveSceneModels(scene) {
  const sceneRecord = asRecord(scene);
  if (!sceneRecord) {
    return [];
  }

  const rawModels = Array.isArray(sceneRecord.models) ? sceneRecord.models : [];
  const mountProfiles = state.resolverConfig.mountProfiles || {};
  const normalizedModels = rawModels
    .map((item, index) => normalizeSceneModel(item, index, mountProfiles))
    .filter(Boolean);
  const baseModelId = readString(sceneRecord, ["base_model_id", "baseModelId"]);
  const baseModel =
    normalizedModels.find((item) => item.id === baseModelId) ||
    normalizedModels.find((item) => !item.interfaceId) ||
    null;
  const interfacePresets = (() => {
    const sceneInterfaces = extractInterfacePresets(sceneRecord.interfaces);
    if (Object.keys(sceneInterfaces).length > 0) {
      return sceneInterfaces;
    }
    return state.resolverConfig.interfacePresets || {};
  })();
  const portComponentOverrides = (() => {
    const sceneOverrides = extractPortComponentOverrides(sceneRecord);
    if (Object.keys(sceneOverrides).length > 0) {
      return sceneOverrides;
    }
    return state.resolverConfig.portComponentOverrides || {};
  })();

  return normalizedModels.map((model) => {
    if (!baseModel || model.id === baseModel.id || !model.interfaceId) {
      return model;
    }

    const interfacePreset = interfacePresets[model.interfaceId];
    if (!interfacePreset) {
      return model;
    }

    const portResidual = lookupPortComponentOverride(
      portComponentOverrides,
      model.interfaceId,
      model.id
    );
    const resolvedPosition = composePosition({
      basePosition: baseModel.position,
      baseRotation: baseModel.rotation,
      localPosition: composeLocalPosition({
        anchorPosition: interfacePreset.position,
        anchorRotation: interfacePreset.rotation,
        mountProfilePosition: model.mountPositionOffset,
        portResidualPosition: portResidual.position,
      }),
    });
    const resolvedRotation = composeRotation({
      baseRotation: baseModel.rotation,
      localRotation: composeLocalRotation({
        anchorRotation: interfacePreset.rotation,
        mountProfileRotation: model.mountRotationOffset,
        portResidualRotation: portResidual.rotation,
      }),
    });

    return {
      ...model,
      position: resolvedPosition,
      rotation: resolvedRotation,
    };
  });
}

function toVectorQuery(raw, fallback = [0, 0, 0]) {
  const [x, y, z] = asVector(raw, fallback);
  return `${x},${y},${z}`;
}

function getSceneModels(envelope) {
  const scene = extractScene(envelope);
  return resolveSceneModels(scene).filter((item) => item.url);
}

function buildAssetSignature(models) {
  return JSON.stringify(
    models.map((item) => ({
      id: item.id,
      url: item.url,
    }))
  );
}

function buildTransformSignature(models) {
  return JSON.stringify(
    models.map((item) => ({
      id: item.id,
      position: item.position,
      rotation: item.rotation,
      scale: item.scale,
    }))
  );
}

function buildViewerUrl(models) {
  const url = new URL("./viewer-frame.html", window.location.href);
  url.searchParams.set("channel", VIEWER_CHANNEL);
  url.searchParams.set("layout", "center");
  url.searchParams.set("spacing", "1.5");
  url.searchParams.set("drag", "false");
  url.searchParams.set("t", String(Date.now()));

  const positionRows = [];
  const rotationRows = [];
  const scaleRows = [];

  for (const model of models) {
    url.searchParams.append("file", model.url);
    url.searchParams.append("id", model.id);
    positionRows.push(toVectorQuery(model.position));
    rotationRows.push(toVectorQuery(model.rotation));
    scaleRows.push(toVectorQuery(model.scale, [1, 1, 1]));
  }

  url.searchParams.set("pos", positionRows.join("|"));
  url.searchParams.set("rot", rotationRows.join("|"));
  url.searchParams.set("scl", scaleRows.join("|"));
  return url.toString();
}

function postToParent(payload) {
  if (!window.parent || window.parent === window) {
    return;
  }
  window.parent.postMessage(JSON.stringify(payload), "*");
}

function postToViewer(type, payload = {}) {
  const target = viewerFrame.contentWindow;
  if (!target) {
    return;
  }
  target.postMessage(
    JSON.stringify({
      source: VIEWER_HOST_SOURCE,
      version: 1,
      channel: VIEWER_CHANNEL,
      type,
      ...payload,
    }),
    "*"
  );
}

function setStatus(title, message, tone = "muted") {
  statusTitle.textContent = title;
  statusCopy.textContent = message;
  statusCopy.classList.toggle("error", tone === "error");
}

function showOverlay(title, message, tone = "muted") {
  setStatus(title, message, tone);
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function notifyConsumed(stage) {
  postToParent({
    type: "tesseract-digital-twin-consumed",
    stage,
    revision: state.revision,
    modelCount: state.modelIds.length,
    modelIds: state.modelIds,
  });
}

function notifyViewerReady() {
  postToParent({
    type: "tesseract-digital-twin-viewer-ready",
    stage: "viewer-ready",
    revision: state.revision,
    modelCount: state.modelIds.length,
    modelIds: state.modelIds,
  });
  notifyConsumed("viewer-ready");
}

function applyTransforms(models) {
  postToViewer("setTransforms", {
    models: models.map((item, index) => ({
      index,
      modelId: item.id,
      position: {
        x: item.position[0],
        y: item.position[1],
        z: item.position[2],
      },
      rotation: {
        x: item.rotation[0],
        y: item.rotation[1],
        z: item.rotation[2],
      },
      scale: {
        x: item.scale[0],
        y: item.scale[1],
        z: item.scale[2],
      },
    })),
  });
}

function applySceneEnvelope(rawEnvelope) {
  const envelope = extractEnvelope(rawEnvelope);
  if (!envelope) {
    return;
  }

  const models = getSceneModels(envelope);
  state.currentEnvelope = envelope;
  state.revision = envelope.revision ?? rawEnvelope?.revision ?? null;
  state.modelIds = models.map((item) => item.id);

  const assetSignature = buildAssetSignature(models);
  const transformSignature = buildTransformSignature(models);

  if (models.length === 0) {
    state.assetSignature = "";
    state.transformSignature = "";
    state.viewerReady = false;
    viewerFrame.removeAttribute("src");
    showOverlay("Digital Twin", "当前场景没有可渲染的 3D 模型。");
    notifyConsumed("scene-applied");
    return;
  }

  if (assetSignature !== state.assetSignature) {
    state.assetSignature = assetSignature;
    state.transformSignature = transformSignature;
    state.viewerReady = false;
    showOverlay("Digital Twin", "正在同步 3D 资产与场景布局…");
    viewerFrame.src = buildViewerUrl(models);
    notifyConsumed("scene-applied");
    return;
  }

  if (transformSignature !== state.transformSignature) {
    state.transformSignature = transformSignature;
    applyTransforms(models);
    notifyConsumed("scene-applied");
  }
}

window.addEventListener("message", (event) => {
  if (event.source === viewerFrame.contentWindow) {
    const payload = normalizePayload(event.data);
    if (!payload || payload.source !== VIEWER_SOURCE || payload.channel !== VIEWER_CHANNEL) {
      return;
    }

    switch (payload.type) {
      case "viewerReady":
        state.viewerReady = true;
        hideOverlay();
        notifyViewerReady();
        break;
      case "viewerError":
        showOverlay("Digital Twin", payload.message || "3D viewer failed", "error");
        postToParent({
          type: "tesseract-digital-twin-consumed",
          stage: "viewer-error",
          revision: state.revision,
          modelCount: state.modelIds.length,
          modelIds: state.modelIds,
          message: payload.message || "3D viewer failed",
        });
        break;
      case "selectionChanged":
        postToParent({
          type: "tesseract-digital-twin-model-click",
          revision: state.revision,
          modelId: payload.modelId ?? null,
        });
        break;
      default:
        break;
    }
    return;
  }

  const payload = normalizePayload(event.data);
  if (!payload) {
    return;
  }

  switch (payload.type) {
    case "tesseract-digital-twin-scene":
      applySceneEnvelope(payload.envelope ?? payload);
      break;
    case "tesseract-digital-twin-preview-state":
      state.previewEnvelope = payload.envelope ?? payload;
      break;
    default:
      break;
  }
});

viewerFrame.addEventListener("load", () => {
  if (state.currentEnvelope) {
    const models = getSceneModels(state.currentEnvelope);
    if (models.length > 0) {
      applyTransforms(models);
    }
  }
});

showOverlay("Digital Twin", "等待主工作区下发场景数据…");
postToParent({ type: "tesseract-digital-twin-ready" });
