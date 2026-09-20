declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.json' {
  const content: string;
  export default content;
}

interface Window {
  __apibeam_capturing?: boolean;
  __apibeam_capturing_timer?: number;
  __apibeam_loader_installed?: boolean;
}
