import { Cn as toDisplayString, D as createElementBlock, It as ref, M as createVNode, P as defineComponent, Q as onUnmounted, Z as onMounted, bt as withCtx, et as openBlock, j as createTextVNode, ot as resolveComponent, w as createBaseVNode } from "./vue.runtime.esm-bundler-XtMkEjzB.js";
import "./_MapCache-BpDQM3eE.js";
import { Pt as useRouter } from "./src-Hou_zQaF.js";
import { t as __plugin_vue_export_helper_default } from "./_plugin-vue_export-helper-DltO58Gh.js";
import { nr as useToast } from "./ui.store-Cpjm3B-h.js";
import "./sanitize-html-Bm7Ej2cW.js";
import { Io as VIEWS } from "./constants-CpkFUv1J.js";
import "./merge-6pup5Abj.js";
import "./_baseOrderBy-FBF5m4XW.js";
import "./dateformat-DqegO0le.js";
import "./useDebounce-DcGabTQy.js";
var _hoisted_1 = { class: "custom-page" };
var _hoisted_2 = { class: "container" };
var _hoisted_3 = { class: "content-section" };
var _hoisted_4 = { class: "button-group" };
var MyCustomView_default = /* @__PURE__ */ __plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MyCustomView",
	setup(__props) {
		const router = useRouter();
		const toast = useToast();
		const currentTime = ref((/* @__PURE__ */ new Date()).toLocaleString());
		const loadCount = ref(1);
		let timer = null;
		const handleClick = () => {
			toast.showMessage({
				title: "点击成功",
				message: "你点击了主要按钮！",
				type: "success"
			});
		};
		const goToWorkflows = () => {
			router.push({ name: VIEWS.WORKFLOWS });
		};
		const showMessage = () => {
			toast.showMessage({
				title: "自定义消息",
				message: "这是一个自定义消息示例",
				type: "info"
			});
		};
		onMounted(() => {
			timer = setInterval(() => {
				currentTime.value = (/* @__PURE__ */ new Date()).toLocaleString();
			}, 1e3);
		});
		onUnmounted(() => {
			if (timer) clearInterval(timer);
		});
		return (_ctx, _cache) => {
			const _component_n8n_heading = resolveComponent("n8n-heading");
			const _component_n8n_text = resolveComponent("n8n-text");
			const _component_el_button = resolveComponent("el-button");
			const _component_el_card = resolveComponent("el-card");
			return openBlock(), createElementBlock("div", _hoisted_1, [createBaseVNode("div", _hoisted_2, [
				createVNode(_component_n8n_heading, {
					tag: "h1",
					size: "2xlarge"
				}, {
					default: withCtx(() => [..._cache[0] || (_cache[0] = [createTextVNode("我的自定义页面", -1)])]),
					_: 1
				}),
				createVNode(_component_n8n_text, {
					size: "large",
					class: "mb-l"
				}, {
					default: withCtx(() => [..._cache[1] || (_cache[1] = [createTextVNode(" 这是你的自定义页面内容。你可以在这里添加任何你需要的功能。 ", -1)])]),
					_: 1
				}),
				createBaseVNode("div", _hoisted_3, [createVNode(_component_el_card, { class: "mb-m" }, {
					header: withCtx(() => [..._cache[2] || (_cache[2] = [createBaseVNode("span", null, "功能示例", -1)])]),
					default: withCtx(() => [createBaseVNode("div", _hoisted_4, [
						createVNode(_component_el_button, {
							type: "primary",
							onClick: handleClick
						}, {
							default: withCtx(() => [..._cache[3] || (_cache[3] = [createTextVNode("主要按钮", -1)])]),
							_: 1
						}),
						createVNode(_component_el_button, {
							type: "success",
							onClick: goToWorkflows
						}, {
							default: withCtx(() => [..._cache[4] || (_cache[4] = [createTextVNode("查看工作流", -1)])]),
							_: 1
						}),
						createVNode(_component_el_button, {
							type: "info",
							onClick: showMessage
						}, {
							default: withCtx(() => [..._cache[5] || (_cache[5] = [createTextVNode("显示消息", -1)])]),
							_: 1
						})
					])]),
					_: 1
				}), createVNode(_component_el_card, null, {
					header: withCtx(() => [..._cache[6] || (_cache[6] = [createBaseVNode("span", null, "信息卡片", -1)])]),
					default: withCtx(() => [createVNode(_component_n8n_text, null, {
						default: withCtx(() => [createTextVNode(" 当前时间：" + toDisplayString(currentTime.value), 1)]),
						_: 1
					}), createVNode(_component_n8n_text, { class: "mt-s" }, {
						default: withCtx(() => [createTextVNode(" 页面已加载 " + toDisplayString(loadCount.value) + " 次 ", 1)]),
						_: 1
					})]),
					_: 1
				})])
			])]);
		};
	}
}), [["__scopeId", "data-v-56f02e37"]]);
export { MyCustomView_default as default };
