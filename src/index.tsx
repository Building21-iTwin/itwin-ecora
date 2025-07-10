/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import "./index.css";
import "@itwin/itwinui-react/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { SvgError } from "@itwin/itwinui-illustrations-react";
import { NonIdealState, ThemeProvider } from "@itwin/itwinui-react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { App } from "./components/App";
import { AuthorizationProvider, SignInRedirect } from "./Authorization";
import { SelectionProvider } from "./components/shared/SelectionContext";

const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider theme="light">
      <ErrorBoundary
        FallbackComponent={({ error }) => (
          <NonIdealState
            svg={<SvgError />}
            heading={"An error occurred"}
            description={error.message}
          />
        )}
      >
        <AuthorizationProvider>
          <SelectionProvider>
            <Outlet />
          </SelectionProvider>
        </AuthorizationProvider>
      </ErrorBoundary>
    </ThemeProvider>
  ),
});

interface IndexSearchParams {
  iTwinId: string;
  iModelId: string;
  changesetId?: string;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  validateSearch: (search: Record<string, unknown>): IndexSearchParams => {
    const iTwinId =
      (search.iTwinId as string | undefined) ?? import.meta.env.IMJS_ITWIN_ID;
    const iModelId =
      (search.iModelId as string | undefined) ?? import.meta.env.IMJS_IMODEL_ID;
    const changesetId = search.changesetId as string | undefined;
    if (!iTwinId || !iModelId) {
      throw new Error(
        "Please add a valid iTwin ID and iModel ID in the .env file and restart the application or add it to the `iTwinId`/`iModelId` query parameter in the url and refresh the page. See the README for more information."
      );
    }
    return {
      iTwinId,
      iModelId,
      changesetId,
    };
  },
  path: "/",
  component: function Index() {
    const { iTwinId, iModelId } = indexRoute.useSearch();
    return <App iTwinId={iTwinId} iModelId={iModelId} />;
  },
});

const signinRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signin-callback",
  component: SignInRedirect,
});

const routeTree = rootRoute.addChildren([indexRoute, signinRedirectRoute]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
