import * as MonoUtils from "@fermuch/monoutils";

declare class BatterySensorEvent extends MonoUtils.wk.event.BaseEvent {
  kind: "sensor-battery";

  getData(): {
    level: number;
    isLowPower: boolean;
  };
}

declare class GPSSensorEvent extends MonoUtils.wk.event.BaseEvent {
  kind: "sensor-gps";
  getData(): {
    latitude: number;
    longitude: number;
    altitude: number;
    accuracy: number;
    altitudeAccuracy: number;
    heading: number;
    speed: number;
  };
}

// based on settingsSchema @ package.json
type Config = Record<string, unknown> & {}
const conf = new MonoUtils.config.Config<Config>();

function updatePeriodically() {
  MonoUtils.collections.maybeUpdateFrota('net', data.NET_TYPE);
  MonoUtils.collections.maybeUpdateFrota('appVer', data.APP_VERSION);
  MonoUtils.collections.maybeUpdateFrota('bleConnected', Boolean(data.BLE_CONNECTED));
}

messages.on('onInit', function() {
  updatePeriodically();
});

messages.on('onPeriodic', function () {
  updatePeriodically();
});

messages.on('onLogin', function (loginId) {
  MonoUtils.collections.maybeUpdateFrota('currentLogin', loginId);
  MonoUtils.collections.maybeUpdateFrota('loginDate', Date.now());
});

messages.on('onLogout', function () {
  MonoUtils.collections.maybeUpdateFrota('currentLogin', null);
  MonoUtils.collections.maybeUpdateFrota('loginDate', null);
});

MonoUtils.wk.event.subscribe<BatterySensorEvent>('sensor-battery', function (event) {
  MonoUtils.collections.maybeUpdateFrota('batteryLevel', event.getData().level);
  MonoUtils.collections.maybeUpdateFrota('isLowPower', event.getData().isLowPower);
});

MonoUtils.wk.event.subscribe<GPSSensorEvent>('sensor-gps', function (event) {
  try {
    const data = event.getData();
    if (data.accuracy <= 30) {
      env.setData('CURRENT_GPS', {
        date: Date.now(),
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
        accuracy: data.accuracy,
        altitudeAccuracy: data.altitudeAccuracy,
        heading: data.heading,
        speed: data.speed,
      });
    }
  } catch {
    // ignore
  }
})