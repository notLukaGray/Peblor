export const STARTER_TEXTURES = {
  albedoTex: {
    type: "image",
    source: "/assets/models/example/albedo.jpg",
  },
  videoMaskTex: {
    type: "video",
    source: "/assets/models/example/emissive.mp4",
    loop: true,
    muted: true,
    useAsAlphaMap: true,
  },
};

export const STARTER_MATERIALS = {
  body: {
    albedo: "albedoTex",
    roughness: 0.65,
    metallic: 0.1,
  },
};

export const STARTER_MODELS = {
  heroModel: {
    geometry: "/assets/models/example/hero.glb",
    materialBindings: {
      Body: "body",
    },
  },
};

export const STARTER_SCENE = {
  camera: {
    type: "perspective",
    fov: 45,
    near: 0.1,
    far: 100,
    position: [0, 0.7, 6],
  },
  lights: [
    {
      type: "ambient",
      intensity: 0.8,
      color: "#ffffff",
    },
    {
      type: "directional",
      position: [3, 5, 4],
      intensity: 1.1,
      color: "#ffffff",
    },
  ],
  contents: {
    models: [
      {
        model: "heroModel",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1,
      },
    ],
  },
};
