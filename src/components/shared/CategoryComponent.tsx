import {
  EmphasizeElements,
  IModelApp,
} from "@itwin/core-frontend";
import React, { useContext, useEffect, useState } from "react";
import { Button, Flex, SearchBox, Tooltip } from "@itwin/itwinui-react";
import { CategoryModelContext } from "../App";

interface Category {
  label: string;
  id: string;
}

export function CategoryComponent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { selectedCategoryIds, setSelectedCategoryIds } =
    useContext(CategoryModelContext);
  const [searchString, setSearchString] = useState<string>("");
  const [iModel, setIModel] = useState(() => IModelApp.viewManager.selectedView?.iModel);

  // Listen for view changes and update iModel
  useEffect(() => {
    const updateIModel = () => {
      setIModel(IModelApp.viewManager.selectedView?.iModel);
    };
    IModelApp.viewManager.onSelectedViewportChanged.addListener(updateIModel);
    // Initial set
    updateIModel();
    return () => {
      IModelApp.viewManager.onSelectedViewportChanged.removeListener(updateIModel);
    };
  }, []);

  // Fetch categories when iModel changes
  useEffect(() => {
    const getCategories = async () => {
      if (iModel) {
        const queryReader = iModel.createQueryReader(
          "SELECT ECInstanceId, COALESCE(UserLabel, CodeValue) FROM bis.SpatialCategory WHERE ECInstanceId IN (SELECT DISTINCT Category.Id FROM bis.GeometricElement3d WHERE Category.Id IS NOT NULL)"
        );
        const cats = await queryReader.toArray();
        setCategories(cats.map((cat) => ({ id: cat[0], label: cat[1] })));
      } else {
        setCategories([]);
      }
    };
    void getCategories();
  }, [iModel]);

  // Selection listener (optional, as before)
  useEffect(() => {
    const selectionListener = () => {
      const view = IModelApp.viewManager.selectedView;
      if (view) {
        const emphasize = EmphasizeElements.getOrCreate(view);
        const appearance = emphasize
          .createDefaultAppearance()
          .clone({ nonLocatable: undefined });
        emphasize.emphasizeSelectedElements(view, appearance, true, false);
      }
    };
    const selectedView = IModelApp.viewManager.selectedView;
    const selViewIModel = selectedView ? selectedView.iModel : undefined;
    if (selViewIModel) {
      if (!selViewIModel.selectionSet.onChanged.has(selectionListener)) {
        selViewIModel.selectionSet.onChanged.addListener(selectionListener);
      }
    }
    return () => {
      if (selViewIModel && selViewIModel.selectionSet.onChanged.has(selectionListener)) {
        selViewIModel.selectionSet.onChanged.removeListener(selectionListener);
      }
    };
  }, [iModel]);

  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const categoryId = event.target.id;
    const newSelectedIds = selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId];
    setSelectedCategoryIds(newSelectedIds);
  };

  const searchTextLower = searchString.toLowerCase();
  const filteredCategories = categories.filter((category) => {
    const categoryLower = category.label.toLowerCase();
    return categoryLower.includes(searchTextLower);
  });
  const categoryElements = filteredCategories.map((category) => (
    <li key={category.id} style={{ listStyle: "none", margin: "0.25rem 0", padding: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input
        type="checkbox"
        id={category.id}
        name="category"
        checked={selectedCategoryIds.includes(category.id)}
        onChange={handleCategoryChange}
      />
      <Tooltip content="Select category" placement="bottom">
        <label htmlFor={category.id} style={{ cursor: "pointer" }}>{category.label}</label>
      </Tooltip>
    </li>
  ));

  function searchInputChanged(event: any): void {
    setSearchString(event.target.value);
  }

  function ClearBoxes(): void {
    setSelectedCategoryIds([]);
  }

  return (
    <div className="">
      <Flex style={{ position: "relative", width: "98%", padding: "0.3125rem", zIndex: 1, background: "white" }}>
        <SearchBox
          className="SearchBox"
          style={{ width: "85%" }}
          aria-label="Search input"
          inputProps={{
            placeholder: "Search Categories...",
          }}
          onChange={searchInputChanged}
        />
        <Button onClick={ClearBoxes}>Clear</Button>
      </Flex>
      <Flex flexDirection="column" gap="3x1" alignItems="left" style={{ paddingTop: "0.312rem" }}>
        <ul style={{ padding: 0, margin: 0 }}>{categoryElements}</ul>
      </Flex>
    </div>
  );
}
