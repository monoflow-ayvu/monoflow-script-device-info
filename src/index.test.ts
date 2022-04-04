const read = require('fs').readFileSync;
const join = require('path').join;

function loadScript() {
  // import global script
  const script = read(join(__dirname, '..', 'dist', 'bundle.js')).toString('utf-8');
  eval(script);
}

describe("onInit", () => {
  let colStore = {} as Record<any, any>;

  beforeEach(() => {
    colStore = {} as Record<any, any>;
    const mockCol = {
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
});