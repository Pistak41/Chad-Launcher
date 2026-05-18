import type { HeliosModule as HeliosSubModule, MavenComponents } from "helios-core/common";
import type { Module } from "helios-distribution-types";

export interface HeliosModule {
    rawModule: Module;
    serverId: string;
    subModules: HeliosSubModule[];
    mavenComponents: MavenComponents;
    required: Required<HeliosRequired>[];
    localPath: string;
}