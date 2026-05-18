import Webflow from "webflow-api";

export type WebflowAuthenticatedUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type WebflowSite = {
  id: string;
  workspaceId: string;
  displayName: string;
  shortName?: string;
  previewUrl?: string;
};

export type WebflowCustomCode = {
  id: string;
  location: "header" | "footer";
  version: string;
};

export type WebflowCustomScript = {
  id: string;
  displayName: string;
  hostedLocation?: string;
  integrityHash?: string;
  canCopy?: boolean;
  version: string;
};

class WebflowApiClient {
  private client: Webflow;

  constructor(accessToken: string) {
    this.client = new Webflow({ beta: true, token: accessToken });
  }

  async getAuthenticatedUser(): Promise<WebflowAuthenticatedUser> {
    const { data } = await this.client.get("/token/authorized_by");
    return data as WebflowAuthenticatedUser;
  }

  async getSite(siteId: string): Promise<WebflowSite> {
    const { data } = await this.client.get(`/sites/${siteId}`);
    return data as WebflowSite;
  }

  async getSitesList(): Promise<WebflowSite[]> {
    const { data } = await this.client.get("/sites");
    return data.sites as WebflowSite[];
  }

  async getListOfCustomCodes(siteId: string): Promise<WebflowCustomCode[]> {
    try {
      const { data } = await this.client.get(`/sites/${siteId}/custom_code`);
      return data.scripts || [];
    } catch (error: any) {
      if (error?.response?.data?.code === "resource_not_found") return [];
      throw error;
    }
  }

  async getListOfRegisteredScripts(
    siteId: string,
  ): Promise<{ registeredScripts: WebflowCustomScript[]; pagination: any }> {
    const { data } = await this.client.get(
      `/sites/${siteId}/registered_scripts`,
    );
    return data;
  }

  async registerInlineScript(
    siteId: string,
    input: { sourceCode: string; version: string; displayName: string },
  ): Promise<WebflowCustomScript> {
    const { data } = await this.client.post(
      `/sites/${siteId}/registered_scripts/inline`,
      input,
    );
    return data;
  }

  async addCustomCode(
    siteId: string,
    script: WebflowCustomScript & { location: "header" | "footer" },
  ): Promise<WebflowCustomCode> {
    const existingCodes = await this.getListOfCustomCodes(siteId);
    const { data } = await this.client.put(`/sites/${siteId}/custom_code`, {
      scripts: [
        ...existingCodes.filter((code) => code.id !== script.id),
        { id: script.id, version: script.version, location: script.location },
      ],
    });

    return data.scripts.reverse()[0];
  }
}

export default WebflowApiClient;
