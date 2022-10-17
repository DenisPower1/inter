import {
  consW,
  getId,
  hasOwnProperty,
  isCallable,
  isDefined,
  isObj,
  ParserWarning,
  syErr,
  validDomEvent,
  valueType,
} from "./helpers.js";

function isNull(value) {
  return value == null;
}

function getManagerName(attr) {
  const name = attr.replace("{...", "").replace("}", "");

  return name;
}

function isADefinedManager(dataObject, manager) {
  return hasOwnProperty(dataObject, manager);
}

function isAValidAttrManagerSyntax(attr) {
  const pattern = /{(:?\.){3}(:?\S+)}/;

  return pattern.test(attr);
}

function mayBeAnAttrManager(attr) {
  const pattern = /{(:?[\s\S]+)}/;

  return pattern.test(attr);
}

function runNotDefinedManagerError(name) {
  ParserWarning(`
  The attribute manager parser found an attribute manager
  named "${name}", but you did not define it in the "data" object.
  `);
}

function runInvalidEventHandlerError(name, handler) {
  syErr(`
  "${valueType(handler)}" is an invalid
   handler for the "${name}" event, you must
   define only a function as the handler of a dom event.
  `);
}

function runCanNotGetTheValueOfAnEventWarning(name) {
  consW(`
   you are trying to get the value of "${name}",
   it's an event, and you can not get the value of an event.
  `);
}

function runInvalidSettAttrsValueError(props) {
  syErr(`
  "${valueType(props)}" is an invalid value for the "setAttrs" property.
  The "setAttrs" property only accepts a plain Javascript object as its
  value.
  `);
}

function runUnexpectedPropWarning(prop) {
  consW(` 
  The "${prop}" property was not defined in the manager object.
  `);
}

function runNotCallebleError(arg) {
  syErr(`The argument of the observe method must be a function,
  and you defined ${valueType(arg)} as its argument.`);
}

function parse(rootElement, dataObject) {
  const children = rootElement.getElementsByTagName("*");

  for (const child of children) {
    const { name: attr } = child.attributes[0];

    if (child.attributes.length == 1) {
      if (mayBeAnAttrManager(attr) && isAValidAttrManagerSyntax(attr)) {
        const managerName = getManagerName(attr);

        child.removeAttribute(attr);

        if (isADefinedManager(dataObject, managerName))
          spreadAttrs(child, dataObject[managerName]);
        else runNotDefinedManagerError(managerName);
      }
    }
  }
}

function spreadAttrs(Element, managerObject) {
  const specials = new Set(["value", "currentTime"]);
  const isNotSpecial = (name) => !specials.has(name);
  const isAnEvent = (name) => name.startsWith("on") && validDomEvent(name);
  const isSpecial = (name) => !isNotSpecial(name);
  const observerCache = new Map();

  for (const [attrName, attrValue] of Object.entries(managerObject)) {
    if (isNotSpecial(attrName) && !isAnEvent(attrName) && !isNull(attrValue))
      setAttr(Element, attrName, attrValue);
    else if (isSpecial(attrName) && !isNull(attrValue))
      setSpecialAttr(Element, attrName, attrValue);
    else if (isAnEvent(attrName) && !isNull(attrValue))
      defineEvent(Element, attrName, attrValue, managerObject);

    defineReactiveProp(
      managerObject,
      attrName,
      attrValue,
      Element,
      observerCache
    );
  }

  definesetAttrsProp(managerObject);
  defineObserveProp(managerObject, observerCache);
}

function setAttr(Element, name, value) {
  const hasTheAttr = () => Element.hasAttribute(name);
  const attrValue = () => Element.getAttribute(name);

  if (!isNull(value) && value !== attrValue) Element.setAttribute(name, value);
  else if (isNull(value) && hasTheAttr()) Element.removeAttribute(name);
}

function setSpecialAttr(Element, name, value) {
  if (isDefined(value)) Element[name] = value;
  else if (isNull(value)) Element[name] = "";
}

function defineEvent(Element, eventName, handler, managerObject) {
  if (isDefined(handler) && !isCallable(handler))
    runInvalidEventHandlerError(eventName, handler);
  else if (isNull(handler)) Element[eventName] = void 0;
  else Element[eventName] = (event) => handler.call(managerObject, event);
}

function defineReactiveProp(object, name, value, Element, observerCache) {
  const specials = new Set(["value", "currentTime", "checked"]);
  const isNotSpecial = () => !specials.has(name);
  const isAnEvent = () => name.startsWith("on") && validDomEvent(name);
  const isSpecial = () => !isNotSpecial(name);
  let propValue = value;

  Object.defineProperty(object, name, {
    set(newValue) {
      if (isAnEvent()) defineEvent(Element, name, newValue, this);
      else if (isNotSpecial()) setAttr(Element, name, newValue);
      else if (isSpecial()) setSpecialAttr(Element, name, newValue);
      propValue = newValue;
      const callBack = observerCache.get("observeCallBack");

      if (observerCache.has("observeCallBack")) callBack(name, newValue);
    },

    get() {
      if (isSpecial()) return Element[name];
      if (!isAnEvent()) return propValue;
      else runCanNotGetTheValueOfAnEventWarning(name);
      return false;
    },
  });
}

function definesetAttrsProp(object) {
  Object.defineProperty(object, "setAttrs", {
    set(props) {
      if (!isObj(props)) runInvalidSettAttrsValueError(props);

      for (const [prop, value] of Object.entries(props)) {
        if (!hasOwnProperty(this, prop)) {
          runUnexpectedPropWarning(prop);
          continue;
        }

        this[prop] = value;
      }
    },
  });
}

function defineObserveProp(object, map) {
  Object.defineProperty(object, "observe", {
    value(callBack) {
      if (map.size !== 0) return false;
      if (!isCallable(callBack)) runNotCallebleError(callBack);

      map.set("observeCallBack", callBack);

      return true;
    },
  });
}

export function toAttrs(options) {
  if (new.target !== void 0) {
    syErr(`the "toAttrs" function is not a constructor, do not call it with the
    new keyword.`);
  } else if (!isObj(options)) {
    syErr(`"${valueType(options)}" is an invalid argument for
    "toAttrs" function, the argument must be a plain Javascript object.`);
  } else {
    const { in: IN, data } = options;

    const rootElement = getId(IN);

    parse(rootElement, data);

    return data;
  }
}
