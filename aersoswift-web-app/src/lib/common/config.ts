import type { AppConfig } from './types';


export const APP_CONFIG: AppConfig = {
  videoTopic: import.meta.env.VITE_VIDEO_TOPIC || 'aeroswift/camera/feed',
  analyticsTopic: import.meta.env.VITE_ANALYTICS_TOPIC || 'aeroswift/camera/analytics/gate1',
  solace: {
    url: import.meta.env.VITE_SOLACE_URL || 'ws://localhost:8008',
    vpnName: import.meta.env.VITE_SOLACE_VPN || 'default',
    username: import.meta.env.VITE_SOLACE_USERNAME || 'default',
    password: import.meta.env.VITE_SOLACE_PASSWORD || 'default'
  }
};

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const FACE_MATCH_REQUEST_TOPIC = import.meta.env.VITE_FACE_MATCH_REQUEST_TOPIC || 'aeroswift/terminal1/v1/face/match/request';
export const FACE_MATCH_RESULT_TOPIC = import.meta.env.VITE_FACE_MATCH_RESULT_TOPIC || 'aeroswift/terminal1/v1/face/match/result';
export const PASSENGER_LOOKUP_RESPONSE_TOPIC = import.meta.env.VITE_PASSENGER_LOOKUP_RESPONSE_TOPIC || 'aeroswift/terminal1/v1/passenger/lookup/response';
export const FACE_SCAN_RESET_TOPIC = import.meta.env.VITE_FACE_SCAN_RESET_TOPIC || 'aeroswift/terminal1/v1/face/scan/reset';