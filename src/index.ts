import * as MonoUtils from "@fermuch/monoutils";

declare class BatterySensorEvent extends MonoUtils.wk.event.BaseEvent {
  kind: "sensor-battery";

  getData(): {
    level: number;
    isLowPower: boolean;
  };
}

// based on settingsSchema @ package.json
type Config = Record<string, unknown> & {}
const conf = new MonoUtils.config.Config<Config>();

/**
 * Util to update a value if it has changed.
 *
 * @param key key of frota collection
 * @param val value for the key or undefined
 * @returns void
 */
function maybeUpdate<
  K extends keyof MonoUtils.collections.FrotaCollection
>(
  key: K,
  val: MonoUtils.collections.FrotaCollection[K] | undefined
) {
  if (typeof val === 'undefined') {
    return;
  }

  if (typeof key === 'number') {
    return;
  }

  const frota = MonoUtils.collections.getFrotaDoc();
  const currentVal = (frota.data as typeof frota.data)?.[key];
  if (currentVal !== val) {
    frota.set(key, val);
  }
}

function updatePeriodically() {
  maybeUpdate('net', data.NET_TYPE);
  maybeUpdate('appVer', data.APP_VERSION);
  maybeUpdate('bleConnected', Boolean(data.BLE_CONNECTED));
}

messages.on('onInit', function() {
  updatePeriodically();
});

messages.on('onPeriodic', function () {
  updatePeriodically();
});

messages.on('onLogin', function (loginId) {
  maybeUpdate('currentLogin', loginId);
  maybeUpdate('loginDate', Date.now());
});

messages.on('onLogout', function () {
  maybeUpdate('currentLogin', null);
  maybeUpdate('loginDate', null);
});

MonoUtils.wk.event.subscribe<BatterySensorEvent>('sensor-battery', function (event) {
  maybeUpdate('batteryLevel', event.getData().level);
  maybeUpdate('isLowPower', event.getData().isLowPower);
});
