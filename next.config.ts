import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Desactiva el Router Cache cliente para rutas dinámicas.
    // Sin esto, navegar a /chat y volver sirve datos obsoletos del caché.
    staleTimes: { dynamic: 0, static: 180 },
  },
};

export default nextConfig;
