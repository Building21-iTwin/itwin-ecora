/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import "./App.css";
import { type ComponentProps, createContext, useContext, useEffect, useState } from "react";
import { AuthorizationState, useAuthorizationContext } from "../Authorization";
import { Viewer } from "./Viewer";
import { ProgressLinear } from "@itwin/itwinui-react";
import { SelectionProvider } from "./shared/SelectionContext";
import { categoryModelSelection } from "./utils/categoryModelSelection"; 

export interface CategoryModelContextType {
  selectedModelIds: string[];
  setSelectedModelIds: (ids: string[]) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  querySelectionContext: string;
}

export const CategoryModelContext = createContext<CategoryModelContextType>({
  selectedModelIds: [],
  setSelectedModelIds: () => {},
  selectedCategoryIds: [],
  setSelectedCategoryIds: () => {},
  querySelectionContext: "",
});

// Effect component to sync selection/emphasis
function CategoryModelSelectionEffect() {
  const {
    selectedModelIds,
    selectedCategoryIds,
    querySelectionContext,
  } = useContext(CategoryModelContext);

  useEffect(() => {
    // Use the shared selection/emphasis utility whenever selection changes
    void categoryModelSelection(
      selectedCategoryIds,
      selectedModelIds,
      querySelectionContext || "SELECT ECInstanceId, ClassName FROM bis.GeometricElement3d WHERE "
    );
  }, [selectedCategoryIds, selectedModelIds, querySelectionContext]);

  return null;
}

export function App(props: ComponentProps<typeof Viewer>) {
  const { state } = useAuthorizationContext();

  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [querySelectionContext, _setQuerySelectionContext] = useState<string>("");

  const contextValue = {
    selectedModelIds,
    setSelectedModelIds,
    selectedCategoryIds,
    setSelectedCategoryIds,
    querySelectionContext,
  };

  return (
    <SelectionProvider>
      <CategoryModelContext.Provider value={contextValue}>
        <CategoryModelSelectionEffect />
        <div className="viewer-container">
          {state === AuthorizationState.Pending ? (
            <Loader />
          ) : (
            <Viewer {...props} />
          )}
        </div>
      </CategoryModelContext.Provider>
    </SelectionProvider>
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
