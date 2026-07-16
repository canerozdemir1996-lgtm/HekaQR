const nextConfig = require("eslint-config-next");

module.exports = [
  {
    ignores: [
      ".next/**",
      ".test-bundles/**",
      ".cache/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
    ],
  },
  ...nextConfig,
  {
    rules: {
      // Next 14 + React 18 kod tabanı, eslint-config-next 16'nın yeni React
      // compiler kurallarına kademeli taşınıyor. CI bu borcu görünür tutar,
      // fakat mevcut uyarılar release kapısını etkilemez.
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];
