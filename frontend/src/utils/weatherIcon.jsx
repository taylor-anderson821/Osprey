import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog } from 'lucide-react';

const conditionIconMap = {
  'Clear sky':               Sun,
  'Mainly clear':            Sun,
  'Partly cloudy':           Cloud,
  'Overcast':                Cloud,
  'Foggy':                   CloudFog,
  'Icy fog':                 CloudFog,
  'Light drizzle':           CloudDrizzle,
  'Drizzle':                 CloudDrizzle,
  'Heavy drizzle':           CloudDrizzle,
  'Light rain':              CloudRain,
  'Rain':                    CloudRain,
  'Heavy rain':              CloudRain,
  'Light snow':              CloudSnow,
  'Snow':                    CloudSnow,
  'Heavy snow':              CloudSnow,
  'Rain showers':            CloudRain,
  'Heavy rain showers':      CloudRain,
  'Thunderstorm':            CloudLightning,
  'Thunderstorm w/ hail':    CloudLightning,
  'Thunderstorm w/ heavy hail': CloudLightning,
};

const conditionColorMap = {
  'Clear sky':                  'text-yellow-300',
  'Mainly clear':               'text-yellow-300',
  'Partly cloudy':              'text-gray-400',
  'Overcast':                   'text-gray-400',
  'Foggy':                      'text-gray-400',
  'Icy fog':                    'text-gray-400',
  'Light drizzle':              'text-blue-300',
  'Drizzle':                    'text-blue-300',
  'Heavy drizzle':              'text-blue-300',
  'Light rain':                 'text-blue-300',
  'Rain':                       'text-blue-300',
  'Heavy rain':                 'text-blue-300',
  'Light snow':                 'text-blue-100',
  'Snow':                       'text-blue-100',
  'Heavy snow':                 'text-blue-100',
  'Rain showers':               'text-blue-300',
  'Heavy rain showers':         'text-blue-300',
  'Thunderstorm':               'text-yellow-400',
  'Thunderstorm w/ hail':       'text-yellow-400',
  'Thunderstorm w/ heavy hail': 'text-yellow-400',
};

export function WeatherIcon({ condition, size = 18, className }) {
  if (!condition) return null;
  const Icon = conditionIconMap[condition] ?? Cloud;
  const color = className ?? conditionColorMap[condition] ?? 'text-gray-400';
  return <Icon size={size} className={color} title={condition} />;
}
