/**
 * Minimal ambient declarations for the slice of the Chrome extension APIs
 * used by popup.ts. Deliberately not exhaustive — avoids pulling in the
 * full @types/chrome package for a single-file MV3 popup.
 */
declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys: string[] | string | null): Promise<Record<string, string | undefined>>;
      set(items: Record<string, string>): Promise<void>;
    }
    const local: StorageArea;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
    }
    function query(queryInfo: { active: boolean; currentWindow: boolean }): Promise<Tab[]>;
  }

  namespace scripting {
    interface InjectionTarget {
      tabId: number;
    }
    interface InjectionResult<T> {
      result: T;
    }
    function executeScript<T>(injection: {
      target: InjectionTarget;
      func: () => T;
    }): Promise<InjectionResult<T>[]>;
  }
}
