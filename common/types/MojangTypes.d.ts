export interface Rule {
    action: string;
    os?: {
        name: string;
        version?: string;
    };
    features?: {
        [key: string]: boolean;
    };
}
export interface Natives {
    linux?: string;
    osx?: string;
    windows?: string;
}
export interface BaseArtifact {
    sha1: string;
    size: number;
    url: string;
}
export interface LibraryArtifact extends BaseArtifact {
    path: string;
}
export interface Library {
    downloads: {
        artifact: LibraryArtifact;
        classifiers?: {
            javadoc?: LibraryArtifact;
            'natives-linux'?: LibraryArtifact;
            'natives-macos'?: LibraryArtifact;
            'natives-osx'?: LibraryArtifact;
            'natives-windows'?: LibraryArtifact;
            sources?: LibraryArtifact;
        };
    };
    extract?: {
        exclude: string[];
    };
    name: string;
    natives?: Natives;
    rules?: Rule[];
}
export interface VersionJSON {
    arguments: Arguments;
    assetIndex: AssetIndex;
    assets: string;
    complianceLevel: number;
    downloads: VersionJSONDownloads;
    id: string;
    javaVersion: JavaVersion;
    libraries: Library[];
    logging: Logging;
    mainClass: string;
    minimumLauncherVersion: number;
    releaseTime: Date;
    time: Date;
    type: string;
}

export interface Arguments {
    game: Array<GameClass | string>;
    jvm: Array<JVMClass | string>;
}

export interface GameClass {
    rules: GameRule[];
    value: string[] | string;
}

export interface GameRule {
    action: Action;
    features: Features;
}

export enum Action {
    Allow = "allow",
}

export interface Features {
    is_demo_user?: boolean;
    has_custom_resolution?: boolean;
    has_quick_plays_support?: boolean;
    is_quick_play_singleplayer?: boolean;
    is_quick_play_multiplayer?: boolean;
    is_quick_play_realms?: boolean;
}

export interface JVMClass {
    rules: JVMRule[];
    value: string[] | string;
}

export interface JVMRule {
    action: Action;
    os: PurpleOS;
}

export interface PurpleOS {
    name?: Name;
    arch?: string;
}

export enum Name {
    Linux = "linux",
    Osx = "osx",
    Windows = "windows",
}

export interface AssetIndex {
    id: string;
    sha1: string;
    size: number;
    totalSize?: number;
    url: string;
}

export interface VersionJSONDownloads {
    client: ClientMappingsClass;
    client_mappings: ClientMappingsClass;
    server: ClientMappingsClass;
    server_mappings: ClientMappingsClass;
}

export interface ClientMappingsClass {
    sha1: string;
    size: number;
    url: string;
    path?: string;
}

export interface JavaVersion {
    component: string;
    majorVersion: number;
}

export interface Library {
    downloads: LibraryDownloads;
    name: string;
    rules?: LibraryRule[];
}

export interface LibraryDownloads {
    artifact: ClientMappingsClass;
}

export interface LibraryRule {
    action: Action;
    os: FluffyOS;
}

export interface FluffyOS {
    name: Name;
}

export interface Logging {
    client: LoggingClient;
}

export interface LoggingClient {
    argument: string;
    file: AssetIndex;
    type: string;
}


export interface AssetIndex {
    objects: {
        [file: string]: {
            hash: string;
            size: number;
        };
    };
}
export interface MojangVersionManifest {
    latest: {
        release: string;
        snapshot: string;
    };
    versions: {
        id: string;
        type: string;
        url: string;
        time: string;
        releaseTime: string;
        sha1: string;
        complianceLevel: number;
    }[];
}
export interface LauncherJava {
    sha1: string;
    url: string;
    version: string;
}
export interface LauncherVersions {
    launcher: {
        commit: string;
        name: string;
    };
}
export interface LauncherJson {
    java: {
        lzma: {
            sha1: string;
            url: string;
        };
        sha1: string;
    };
    linux: {
        applink: string;
        downloadhash: string;
        versions: LauncherVersions;
    };
    osx: {
        '64': {
            jdk: LauncherJava;
            jre: LauncherJava;
        };
        apphash: string;
        applink: string;
        downloadhash: string;
        versions: LauncherVersions;
    };
    windows: {
        '32': {
            jdk: LauncherJava;
            jre: LauncherJava;
        };
        '64': {
            jdk: LauncherJava;
            jre: LauncherJava;
        };
        apphash: string;
        applink: string;
        downloadhash: string;
        rolloutPercent: number;
        versions: LauncherVersions;
    };
}
