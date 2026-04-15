import { xt as useDeviceSupport } from "./src-Hou_zQaF.js";
import { gi as useSettingsStore } from "./ui.store-Cpjm3B-h.js";
import { T as useRootStore } from "./_baseOrderBy-FBF5m4XW.js";
function useDebugInfo() {
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const { isTouchDevice, userAgent } = useDeviceSupport();
	const coreInfo = (skipSensitive) => {
		const info = {
			n8nVersion: rootStore.versionCli,
			platform: settingsStore.isDocker && settingsStore.deploymentType === "cloud" ? "docker (cloud)" : settingsStore.isDocker ? "docker (self-hosted)" : "npm",
			nodeJsVersion: settingsStore.nodeJsVersion,
			nodeEnv: settingsStore.nodeEnv,
			database: settingsStore.databaseType === "postgresdb" ? "postgres" : settingsStore.databaseType === "mysqldb" ? "mysql" : settingsStore.databaseType,
			executionMode: settingsStore.isQueueModeEnabled ? settingsStore.isMultiMain ? "scaling (multi-main)" : "scaling (single-main)" : "regular",
			concurrency: settingsStore.settings.concurrency,
			license: settingsStore.isCommunityPlan || !settingsStore.settings.license ? "community" : settingsStore.settings.license.environment === "production" ? "enterprise (production)" : "enterprise (sandbox)"
		};
		if (!skipSensitive) return {
			...info,
			consumerId: !skipSensitive ? settingsStore.consumerId : void 0
		};
		return info;
	};
	const storageInfo = () => {
		return {
			success: settingsStore.saveDataSuccessExecution,
			error: settingsStore.saveDataErrorExecution,
			progress: settingsStore.saveDataProgressExecution,
			manual: settingsStore.saveManualExecutions,
			binaryMode: settingsStore.binaryDataMode === "default" ? "memory" : settingsStore.binaryDataMode
		};
	};
	const pruningInfo = () => {
		if (!settingsStore.pruning?.isEnabled) return { enabled: false };
		return {
			enabled: true,
			maxAge: `${settingsStore.pruning?.maxAge} hours`,
			maxCount: `${settingsStore.pruning?.maxCount} executions`
		};
	};
	const securityInfo = () => {
		const info = {};
		if (!settingsStore.security.blockFileAccessToN8nFiles) info.blockFileAccessToN8nFiles = false;
		if (!settingsStore.security.secureCookie) info.secureCookie = false;
		if (Object.keys(info).length === 0) return;
		return info;
	};
	const client = () => {
		return {
			userAgent,
			isTouchDevice
		};
	};
	const gatherDebugInfo = (skipSensitive) => {
		const debugInfo = {
			core: coreInfo(skipSensitive),
			storage: storageInfo(),
			pruning: pruningInfo(),
			client: client()
		};
		const security = securityInfo();
		if (security) debugInfo.security = security;
		return debugInfo;
	};
	const toMarkdown = (debugInfo, { secondaryHeader }) => {
		const extraLevel = secondaryHeader ? "#" : "";
		let markdown = `${extraLevel}# Debug info\n\n`;
		for (const sectionKey in debugInfo) {
			markdown += `${extraLevel}## ${sectionKey}\n\n`;
			const section = debugInfo[sectionKey];
			if (!section) continue;
			for (const itemKey in section) {
				const itemValue = section[itemKey];
				markdown += `- ${itemKey}: ${itemValue}\n`;
			}
			markdown += "\n";
		}
		return markdown;
	};
	const appendTimestamp = (markdown) => {
		return `${markdown}Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}`;
	};
	const generateDebugInfo = ({ skipSensitive, secondaryHeader } = {}) => {
		return appendTimestamp(toMarkdown(gatherDebugInfo(skipSensitive), { secondaryHeader }));
	};
	return { generateDebugInfo };
}
export { useDebugInfo as t };
