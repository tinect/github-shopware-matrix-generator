{ pkgs, inputs, lib, config, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs-18_x;
  };
}