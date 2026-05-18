import { CUSTOM_SCRIPTS_NAME } from "@/config/scripts";
import { getLatestCdnRelease } from "@/repository/cdnRelease";
import WebflowApiClient from "@/services/webflow/api";

export async function injectTodoScript(
  siteId: string,
  accessToken: string,
): Promise<void> {
  const release = await getLatestCdnRelease();
  if (!release) {
    throw new Error(
      "No CDN release found. Build and upload the todo CDN script before registering site scripts.",
    );
  }

  const displayName = CUSTOM_SCRIPTS_NAME.TODO_APP_SCRIPT;
  const location = "footer";
  const sourceCode = `(function(){var s=document.createElement('script');s.src='${release.hostedLocation}';s.async=true;document.head.appendChild(s);})();`;
  const webflowApiClient = new WebflowApiClient(accessToken);

  const { registeredScripts } =
    await webflowApiClient.getListOfRegisteredScripts(siteId);
  let scriptToUse = registeredScripts.find(
    (script) =>
      script.displayName === displayName && script.version === release.version,
  );

  if (!scriptToUse) {
    try {
      scriptToUse = await webflowApiClient.registerInlineScript(siteId, {
        sourceCode,
        version: release.version,
        displayName,
      });
    } catch (error: any) {
      if (error?.response?.data?.code === "duplicate_registered_script") {
        const refreshed =
          await webflowApiClient.getListOfRegisteredScripts(siteId);
        scriptToUse = refreshed.registeredScripts.find(
          (script) =>
            script.displayName === displayName &&
            script.version === release.version,
        );
      } else {
        throw error;
      }
    }
  }

  if (!scriptToUse) throw new Error("Could not resolve registered todo script");
  await webflowApiClient.addCustomCode(siteId, { ...scriptToUse, location });
}
