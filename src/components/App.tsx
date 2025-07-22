/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import "./App.css";
import { type ComponentProps } from "react";
import { AuthorizationState, useAuthorizationContext } from "../Authorization";
import { Viewer } from "./Viewer";
import { ProgressLinear, ThemeProvider } from "@itwin/itwinui-react";
import { SelectionProvider } from "./shared/SelectionContext";


export function App(props: ComponentProps<typeof Viewer>) {
  const { state } = useAuthorizationContext();




  return (
    <ThemeProvider>
      <SelectionProvider>
          <div className="viewer-container">
            {state === AuthorizationState.Pending ? (
              <Loader />
            ) : (
              <Viewer {...props} />
            )}
          </div>
      </SelectionProvider>
    </ThemeProvider>
  );
}

function Loader() {
  return (
    <div className="centered">
      <div className="signin-content">
        <ProgressLinear labels={["Loading..."]} />
      </div>
    </div>
  );
}
