import { IDispatcher } from "@tandem/mesh";
import { ITyped, INamed } from "@tandem/common/object";
import { ICommand } from "@tandem/common/commands";
import { Action } from "../actions";
import { IBrokerBus } from "../dispatchers";

import { File } from "@tandem/common/models";
import {
  IFactory,
  Provider,
  Injector,
  IProvider,
  ClassFactoryProvider,
 } from "./base";

// TODO - add more static find methods to each Provider here

export * from "./base";

/**
 */

export class ApplicationServiceProvider extends ClassFactoryProvider implements IFactory {
  static readonly NS = "application/services";

  constructor(id: string, clazz: { new(): IDispatcher<any, any> }) {
    super(`${ApplicationServiceProvider.NS}/${id}`, clazz);
  }

  create(): IDispatcher<any, any> {
    return super.create();
  }

  static findAll(Injector: Injector): Array<ApplicationServiceProvider> {
    return Injector.queryAll<ApplicationServiceProvider>(`${ApplicationServiceProvider.NS}/**`);
  }
}

/**
 */

export function createSingletonBusProviderClass(name: string): { getInstance(providers:Injector): IBrokerBus, ID: string, new(bus: IBrokerBus): Provider<IBrokerBus> } {

  const id = ["bus", name].join("/");

  return class BusProvider extends Provider<IBrokerBus> {

    static readonly ID = id;

    constructor(bus: IBrokerBus) {
      super(id, bus);
    }

    static getInstance(providers: Injector): IBrokerBus {
      return providers.query<any>(id).value;
    }
  };
}

/**
 * Private bus that can only be used within the application. This typically contains messages
 * that are junk for other outside resources.
 *
 * Bubbles messages to the protected bus.
 */

export const PrivateBusProvider   = createSingletonBusProviderClass("private");


/**
 */

export class InjectorProvider extends Provider<Injector> {
  static ID = "providers";
  constructor() {
    super(InjectorProvider.ID, null);
  }

  clone() {
    return new InjectorProvider();
  }

  get owner(): Injector {
    return this.value;
  }

  set owner(value: Injector) {
    this.value = value;
  }
}

/**
 */

export class CommandFactoryProvider extends ClassFactoryProvider {
  static readonly NS = "commands";
  readonly actionFilter: Function;
  constructor(actionFilter: string|Function, readonly clazz: { new(...rest: any[]): ICommand }) {
    super([CommandFactoryProvider.NS, clazz.name].join("/"), clazz);
    if (typeof actionFilter === "string") {
      this.actionFilter = (action: Action) => action.type === actionFilter;
    } else {
      this.actionFilter = actionFilter;
    }
  }
  create(): ICommand {
    return super.create();
  }
  static findAll(providers: Injector) {
    return providers.queryAll<CommandFactoryProvider>([CommandFactoryProvider.NS, "**"].join("/"));
  }

  static findAllByAction(action: Action, providers: Injector): CommandFactoryProvider[] {
    return this.findAll(providers).filter((dep) => dep.actionFilter(action));
  }

  clone() {
    return new CommandFactoryProvider(this.actionFilter, this.clazz);
  }
}

/**
 */

export class MimeTypeProvider extends Provider<string> {
  static readonly NS = "mimeType";
  constructor(readonly fileExtension: string, readonly mimeType: string) {
    super([MimeTypeProvider.NS, fileExtension].join("/"), mimeType);
  }
  clone() {
    return new MimeTypeProvider(this.fileExtension, this.mimeType);
  }
  static findAll(providers: Injector) {
    return providers.queryAll<MimeTypeProvider>([MimeTypeProvider.NS, "**"].join("/"));
  }
  static lookup(filePath: string, providers: Injector): string {
    const extension = filePath.split(".").pop();
    const dep = providers.query<MimeTypeProvider>([MimeTypeProvider.NS, extension].join("/"));
    return dep ? dep.value : undefined;
  }
}

export class MimeTypeAliasProvider extends Provider<string> {
  static readonly NS = "mimeTypeAliases";
  constructor(readonly mimeType: string, readonly aliasMimeType: string) {
    super(MimeTypeAliasProvider.getNamespace(mimeType), aliasMimeType);
  }
  clone() {
    return new MimeTypeAliasProvider(this.mimeType, this.aliasMimeType);
  }
  static getNamespace(mimeType: string) {
    return [MimeTypeAliasProvider.NS, mimeType].join("/");
  }
  static lookup(filePathOrMimeType: string, providers: Injector): string {
    const mimeType = MimeTypeProvider.lookup(filePathOrMimeType, providers);
    const dep = (mimeType && providers.query<MimeTypeAliasProvider>(this.getNamespace(mimeType))) || providers.query<MimeTypeAliasProvider>(this.getNamespace(filePathOrMimeType));
    return (dep && dep.value) || mimeType || filePathOrMimeType;
  }
}

export function createSingletonProviderClass<T>(id: string): { getInstance(providers: Injector): T, ID: string, new(clazz: { new(...rest): T }): IProvider } {
  return class SingletonProvider implements IProvider {
    static readonly ID: string = id;
    private _value: T;
    private _clazz: { new(...rest): T };
    readonly overridable = false;
    readonly id = id;
    public owner: Injector;

    constructor(clazz: { new(...rest): T }) { this._clazz = clazz; }

    get value(): T {
      return this._value || (this._value = this.owner.create(this._clazz, []));
    }
    clone() {
      return new SingletonProvider(this._clazz);
    }
    static getInstance(providers: Injector): T {
      const dep = providers.query<SingletonProvider>(id);
      return dep ? dep.value : undefined;
    }
  }
}
