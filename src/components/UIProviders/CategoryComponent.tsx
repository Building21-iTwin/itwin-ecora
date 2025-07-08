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
  const iModel = IModelApp.viewManager.selectedView?.iModel;

  useEffect(() => {
    const getCategories = async () => {
      if (iModel) {
        const queryReader = iModel.createQueryReader(
          "SELECT ECInstanceId, COALESCE(UserLabel, CodeValue) FROM bis.SpatialCategory WHERE ECInstanceId IN (SELECT DISTINCT Category.Id FROM bis.GeometricElement3d WHERE Category.Id IS NOT NULL)"
        );
        const cats = await queryReader.toArray();
        setCategories(cats.map((cat) => ({ id: cat[0], label: cat[1] })));
      }
    };
    const selectionListener = () => {
      const view = IModelApp.viewManager.selectedView;
      if (view) {
        if (view) {
          const emphasize = EmphasizeElements.getOrCreate(view);
          const appearance = emphasize
            .createDefaultAppearance()
            .clone({ nonLocatable: undefined });
          emphasize.emphasizeSelectedElements(view, appearance, true, false);
        }
      }
    };
    const selectedView = IModelApp.viewManager.selectedView;
    const selViewIModel = selectedView ? selectedView.iModel : undefined;
    if (selViewIModel) {
      if (!selViewIModel.selectionSet.onChanged.has(selectionListener)) {
        selViewIModel.selectionSet.onChanged.addListener(selectionListener);
      }
    }
    if (categories.length === 0) {
      void getCategories();
    }
  }, [categories, iModel]);

  const handleCategoryChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const categoryIds = event.target.id;
    if (iModel) {
      const newSelectedIds = selectedCategoryIds.includes(categoryIds)
        ? selectedCategoryIds.filter((id) => id !== categoryIds)
        : [...selectedCategoryIds, categoryIds];

      setSelectedCategoryIds(newSelectedIds);
    }
  };

  const searchTextLower = searchString.toLowerCase();
  const filteredCategories = categories.filter((category) => {
    const categoryLower = category.label.toLowerCase();
    return categoryLower.includes(searchTextLower);
  });
  const categoryElements = filteredCategories.map((category) => (
    <ul key={category.id}>
      <input
        type="checkbox"
        id={category.id}
        name="category"
        checked={selectedCategoryIds.includes(category.id)}
        onChange={handleCategoryChange}
      />
      <Tooltip content="Select category" placement="bottom">
        <label htmlFor={category.id}>{category.label}</label>
      </Tooltip>
    </ul>
  ));

  function searchInputChanged(event: any): void {
    setSearchString(event.target.value);
  } 

  function ClearBoxes(): void {
    setSelectedCategoryIds([])
  }

  <header></header>;

  return (
    <div className="">
      <Flex style={{position: "absolute", width:"98%", padding: "5px"}}>
        <SearchBox
        className="SearchBox"
        style={{  width: "85%" }}
        aria-label="Search input"
        inputProps={{
          placeholder: "Search Categories...",
        }}
        onChange={searchInputChanged}
        /> 
        <Button onClick={ClearBoxes}>Clear</Button>
      </Flex>
      
      <Flex flexDirection="column" gap="3x1" alignItems="left" style={{paddingTop: "35px"}}>
        <body>{categoryElements}</body>
      </Flex>
    </div>
  );
}
