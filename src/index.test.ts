import * as MonoUtils from "@fermuch/monoutils";
const read = require('fs').readFileSync;
const join = require('path').join;

function loadScript() {
  // import global script
  const script = read(join(__dirname, '..', 'dist', 'bundle.js')).toString('utf-8');
  eval(script);
}

class MockGPSEvent extends MonoUtils.wk.event.BaseEvent {
  kind = 'sensor-gps' as const;

  constructor(
    private readonly latitude = 1,
    private readonly longitude = 1,
  ) {
    super();
  }

  getData() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      altitude: 1,
      accuracy: 1,
      altitudeAccuracy: 1,
      heading: 1,
      speed: 1,
    };
  }
}

class MockWebLogout extends MonoUtils.wk.event.BaseEvent {
  kind = 'web-logout' as const;
  getData(): null {
    return null;
  }
}

describe("onInit", () => {
  let colStore = {} as Record<any, any>;

  beforeEach(() => {
    colStore = {} as Record<any, any>;
    const mockCol = {
      watch: jest.fn(),
      get() {
        return {
          data: colStore,
          get: (k: string) => colStore[k],
          set: (k: string, v: any) => (colStore[k] = v),
        }
      }
    };
    (env.project as any) = {
      collectionsManager: {
        ensureExists: () => mockCol,
      },
    };
  })

  // clean listeners
  afterEach(() => {
    messages.removeAllListeners();
  });

  it('runs without errors', () => {
    loadScript();
    messages.emit('onInit');
  });

  it('sets common data to collection', () => {
    data.NET_TYPE = 'wifi';
    data.APP_VERSION = '1.2.3'
    data.BLE_CONNECTED = true;
    loadScript();

    messages.emit('onInit');
    expect(colStore.net).toBe('wifi');
    expect(colStore.appVer).toBe('1.2.3');
    expect(colStore.bleConnected).toBe(true);
  });

  it('stores CURRENT_GPS data', () => {
    data.CURRENT_GPS = undefined;

    loadScript();
    messages.emit('onInit');
    messages.emit('onEvent', new MockGPSEvent());

    expect(data.CURRENT_GPS).toBeTruthy();
    const currentGps = data.CURRENT_GPS as {
      latitude: number;
      longitude: number;
      speed: number;
      date: number;
    };
    expect(currentGps.latitude).toBe(1);
    expect(currentGps.longitude).toBe(1);
    expect(currentGps.speed).toBe(1);
    expect(currentGps.date).toBeGreaterThan(0);
  });

  it('handles ScriptEvent: web-logout', () => {
    (env.project as any) = {
      collectionsManager: {
        ensureExists: jest.fn(),
      },
      logout: jest.fn(),
    };
    loadScript();
    messages.emit('onEvent', new MockWebLogout());
    expect((env.project as any).logout).toHaveBeenCalled();
  });
});