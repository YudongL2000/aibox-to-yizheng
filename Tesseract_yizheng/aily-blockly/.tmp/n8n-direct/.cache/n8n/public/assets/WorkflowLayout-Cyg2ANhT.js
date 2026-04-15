import { C as computed, M as createVNode, P as defineComponent, T as createBlock, bt as withCtx, ct as resolveDynamicComponent, et as openBlock, ot as resolveComponent, v as KeepAlive } from "./vue.runtime.esm-bundler-XtMkEjzB.js";
import "./_MapCache-BpDQM3eE.js";
import { Nt as useRoute } from "./src-Hou_zQaF.js";
import "./ui.store-Cpjm3B-h.js";
import "./sanitize-html-Bm7Ej2cW.js";
import { t as BaseLayout_default } from "./BaseLayout-Y3xdoS4G.js";
import "./constants-CpkFUv1J.js";
import "./merge-6pup5Abj.js";
import "./_baseOrderBy-FBF5m4XW.js";
import "./dateformat-DqegO0le.js";
import "./useDebounce-DcGabTQy.js";
import { t as useAssistantStore } from "./assistant.store-CVH65TPR.js";
function useLayoutProps() {
	const route = useRoute();
	return { layoutProps: computed(() => {
		return route.meta.layoutProps ?? {};
	}) };
}
var WorkflowLayout_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowLayout",
	setup(__props) {
		const { layoutProps } = useLayoutProps();
		useAssistantStore();
		return (_ctx, _cache) => {
			const _component_RouterView = resolveComponent("RouterView");
			return openBlock(), createBlock(BaseLayout_default, null, {
				default: withCtx(() => [createVNode(_component_RouterView, null, {
					default: withCtx(({ Component }) => [(openBlock(), createBlock(KeepAlive, {
						include: "NodeView",
						max: 1
					}, [(openBlock(), createBlock(resolveDynamicComponent(Component)))], 1024))]),
					_: 1
				})]),
				_: 1
			});
		};
	}
});
export { WorkflowLayout_default as default };
