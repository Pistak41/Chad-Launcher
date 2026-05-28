import type { HeliosModule as HeliosSubModule, MavenComponents } from "helios-core/common";
import type { Module } from "helios-distribution-types";
import { HeliosServer as HS } from 'helios-core/common';

export interface HeliosServer extends HS {
    modules: HeliosModule[]
}

export interface HeliosModule {
    rawModule: Module;
    serverId: string;
    subModules: HeliosSubModule[];
    mavenComponents: MavenComponents;
    required: Required<HeliosRequired>[];
    localPath: string;
}