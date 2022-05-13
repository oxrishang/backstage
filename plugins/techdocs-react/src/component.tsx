/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, {
  memo,
  PropsWithChildren,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { create } from 'jss';
import { StylesProvider, jssPreset } from '@material-ui/styles';

import { Progress } from '@backstage/core-components';

/**
 * Name for the event dispatched when ShadowRoot styles are loaded.
 * @public
 */
export const SHADOW_DOM_STYLE_LOAD_EVENT = 'TECH_DOCS_SHADOW_DOM_STYLE_LOAD';

/**
 * Dispatch style load event after all styles are loaded.
 * @param element - the ShadowRoot tree.
 */
const useShadowDomStylesEvents = (element: Element | null) => {
  useEffect(() => {
    if (!element) {
      return () => {};
    }

    const styles = element.querySelectorAll<HTMLElement>(
      'head > link[rel="stylesheet"]',
    );

    let count = styles?.length ?? 0;
    const event = new CustomEvent(SHADOW_DOM_STYLE_LOAD_EVENT);

    if (!count) {
      element.dispatchEvent(event);
      return () => {};
    }

    const handleLoad = () => {
      if (--count === 0) {
        element.dispatchEvent(event);
      }
    };

    styles?.forEach(style => {
      style.addEventListener('load', handleLoad);
    });

    return () => {
      styles?.forEach(style => {
        style.removeEventListener('load', handleLoad);
      });
    };
  }, [element]);
};

/**
 * Returns the style's loading state.
 * @param element - which is the ShadowRoot tree.
 * @returns a boolean value, true if styles are being loaded.
 * @public
 */
export const useShadowDomStylesLoading = (element: Element | null) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!element) return () => {};

    setLoading(true);

    const style = (element as HTMLElement).style;

    style.setProperty('opacity', '0');

    const handleLoad = () => {
      // As styles loading can be fast, a delay is used to display a progress bar
      // and give the user time to see it before displaying the page content.
      setTimeout(() => {
        setLoading(false);
        style.setProperty('opacity', '1');
      }, 500);
    };

    element.addEventListener(SHADOW_DOM_STYLE_LOAD_EVENT, handleLoad);

    return () => {
      element.removeEventListener(SHADOW_DOM_STYLE_LOAD_EVENT, handleLoad);
    };
  }, [element]);

  return loading;
};

/**
 * Props fof {@link TechDocsShadowDom}.
 * @public
 */
export type TechDocsShadowDomProps = PropsWithChildren<{
  /**
   * Element that is appended to ShadowRoot.
   */
  element: Element;
  /**
   * Callback called when element is appended in ShadowRoot.
   */
  onAppend: (shadowRoot: ShadowRoot) => void;
}>;

/**
 * Checks for changes in props and re-renders only when the element's innerHTML has changed.
 * @param prevProps - last rendered props.
 * @param nextProps - props to be rendered.
 * @returns true when the props are the same.
 */
const areEquals = (
  prevProps: TechDocsShadowDomProps,
  nextProps: TechDocsShadowDomProps,
) => {
  const prevElementInnerHTML = prevProps.element.innerHTML;
  const nextElementInnerHTML = nextProps.element.innerHTML;
  return prevElementInnerHTML === nextElementInnerHTML;
};

/**
 * Renders a tree of elements in the Shadow DOM.
 * @param props - see {@link TechDocsShadowDomProps}.
 * @public
 */
export const TechDocsShadowDom = memo(
  ({ element, onAppend, children }: TechDocsShadowDomProps) => {
    const [jss, setJss] = useState(
      create({
        ...jssPreset(),
        insertionPoint: undefined,
      }),
    );

    useShadowDomStylesEvents(element);
    const loading = useShadowDomStylesLoading(element);

    const ref = useCallback(
      (shadowHost: HTMLDivElement) => {
        if (!element || !shadowHost) return;

        setJss(
          create({
            ...jssPreset(),
            insertionPoint: element.querySelector('head') || undefined,
          }),
        );

        let shadowRoot = shadowHost.shadowRoot;

        if (!shadowRoot) {
          shadowRoot = shadowHost.attachShadow({ mode: 'open' });
        }

        shadowRoot.replaceChildren(element);

        if (typeof onAppend === 'function') {
          onAppend(shadowRoot);
        }
      },
      [element, onAppend],
    );

    // sheetsManager={new Map()} is needed in order to deduplicate the injection of CSS in the page.
    return (
      <>
        {loading && <Progress />}
        <StylesProvider jss={jss} sheetsManager={new Map()}>
          <div ref={ref} data-testid="techdocs-native-shadowroot" />
          {children}
        </StylesProvider>
      </>
    );
  },
  areEquals,
);
