{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.typescript
    pkgs.nodePackages.npm
    pkgs.postgresql_15
    pkgs.redis
    pkgs.git
    pkgs.curl
    pkgs.wget
  ];
} 