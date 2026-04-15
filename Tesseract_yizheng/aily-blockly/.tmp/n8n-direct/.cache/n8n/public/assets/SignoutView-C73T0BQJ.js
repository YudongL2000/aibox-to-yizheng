import { D as createElementBlock, P as defineComponent, Z as onMounted, et as openBlock } from "./vue.runtime.esm-bundler-XtMkEjzB.js";
import { gt as useI18n } from "./_MapCache-BpDQM3eE.js";
import { Pt as useRouter } from "./src-Hou_zQaF.js";
import { nr as useToast, yr as useUsersStore } from "./ui.store-Cpjm3B-h.js";
import "./sanitize-html-Bm7Ej2cW.js";
import { Io as VIEWS } from "./constants-CpkFUv1J.js";
import "./merge-6pup5Abj.js";
import "./_baseOrderBy-FBF5m4XW.js";
import "./dateformat-DqegO0le.js";
import "./useDebounce-DcGabTQy.js";
var SignoutView_default = /* @__PURE__ */ defineComponent({
	__name: "SignoutView",
	setup(__props) {
		const usersStore = useUsersStore();
		const toast = useToast();
		const router = useRouter();
		const i18n = useI18n();
		const logout = async () => {
			try {
				await usersStore.logout();
				window.location.href = router.resolve({ name: VIEWS.SIGNIN }).href;
			} catch (e) {
				toast.showError(e, i18n.baseText("auth.signout.error"));
			}
		};
		onMounted(() => {
			logout();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div");
		};
	}
});
export { SignoutView_default as default };
