import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "agent/**",
      "next-env.d.ts",
      "coverage/**",
    ],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
