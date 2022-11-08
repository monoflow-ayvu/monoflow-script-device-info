import * as MonoUtils from "@fermuch/monoutils";
import { currentLogin } from "@fermuch/monoutils";

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

declare class ScriptEvent<K extends string, T> extends MonoUtils.wk.event.BaseEvent {
  kind: K;
  payload: T;
  getData(): T
}

declare class WebLogout extends ScriptEvent<'web-logout', null> {
  kind: 'web-logout';
  payload: null;
}

class SyncStateEvent extends MonoUtils.wk.event.BaseEvent {
  kind = "sync-state";

  constructor(private packets: SyncPacket[]) {
    super();
  }
  
  getData() {
    return {
      packets: this.packets,
    }
  }
}

// based on settingsSchema @ package.json
type Config = Record<string, unknown> & {}
const conf = new MonoUtils.config.Config<Config>();

interface SyncPacket {
  when: number;
  net: string;
  hasInternet: boolean;
  bleConnected: boolean;
  pulsus: boolean;
}
let syncPackets: SyncPacket[] = [];

function updatePeriodically() {
  MonoUtils.collections.maybeUpdateFrota('net', data.NET_TYPE);
  MonoUtils.collections.maybeUpdateFrota('appVer', data.APP_VERSION);
  MonoUtils.collections.maybeUpdateFrota('bleConnected', Boolean(data.BLE_CONNECTED));

  syncPackets.push({
    when: Date.now(),
    net: String(data.NET_TYPE),
    hasInternet: Boolean(data.NET_HAS_INTERNET),
    bleConnected: Boolean(data.BLE_CONNECTED),
    pulsus: Boolean(data.PULSUS_ACTIVE),
  });

  const oldestDate = syncPackets[0]!.when;
  const now = Date.now();
  // 5 minutes
  if ((now - oldestDate) / 1000 >= 300) {
    env.project.saveEvent(new SyncStateEvent(syncPackets));
    syncPackets = [];
  }
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
});

MonoUtils.wk.event.subscribe<WebLogout>('web-logout', function () {
  try {
    env.project?.logout();
  } catch {
    platform.log('could not logout for web-logout');
  }
});