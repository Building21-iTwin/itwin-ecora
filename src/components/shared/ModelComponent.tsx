import { IModelApp } from "@itwin/core-frontend";
import React, { useContext, useEffect, useState } from "react";
import { CategoryModelContext } from "../App";
import { Button, Flex, SearchBox, Tooltip } from "@itwin/itwinui-react";

interface Model {
  label: string;
  id: string;
}

export function ModelComponent() {
  const [models, setModels] = useState<Model[]>([]);
  const { selectedModelIds, setSelectedModelIds } =
    useContext(CategoryModelContext);
  const [searchString, setSearchString] = useState<string>("");
  const iModel = IModelApp.viewManager.selectedView?.iModel;

  useEffect(() => {
    const getModels = async () => {
      if (iModel) {
        const queryReader = iModel.createQueryReader(
          "SELECT m.ECInstanceId modelId, COALESCE(p.UserLabel, CodeValue) FROM bis.PhysicalModel m JOIN bis.PhysicalPartition p ON p.ECInstanceId = m.ModeledElement.Id WHERE m.ECInstanceId IN (SELECT DISTINCT Model.Id FROM bis.GeometricElement3d WHERE Model.Id IS NOT NULL)"
        );
        const cats = await queryReader.toArray();
        setModels(cats.map((cat) => ({ id: cat[0], label: cat[1] })));
      }
    };
    if (models.length === 0) {
      void getModels();
    }
  }, [models, iModel]);

  const handleModelChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const modelIds = event.target.id;

    if (iModel) {
      const isSelected = selectedModelIds.includes(modelIds);
      const newSelectedIds = isSelected
        ? selectedModelIds.filter((id) => id !== modelIds)
        : [...selectedModelIds, modelIds];

      setSelectedModelIds(newSelectedIds);
    }
  };

  const searchTextLower = searchString.toLowerCase();
  const filteredModels = models.filter((category) => {
    const categoryLower = category.label.toLowerCase();
    return categoryLower.includes(searchTextLower);
  });

  const modelElements = filteredModels.map((model) => (
    <ul key={model.id}>
      <input
        type="checkbox"
        id={model.id}
        name="model"
        checked={selectedModelIds.includes(model.id)}
        onChange={handleModelChange}
      />
      <Tooltip content="Select Model" placement="bottom">
        <label htmlFor={model.id}>{model.label}</label>
      </Tooltip>
    </ul>
  ));

  function searchInputChanged(event: any): void {
    setSearchString(event.target.value);
  }

  function ClearBoxes(): void {
    setSelectedModelIds([])
  }

  return (
    <div className="">
      <Flex style={{position: "absolute", width:"98%", padding: "0.3125rem"}}>
        <SearchBox
        className="SearchBox"
        style={{ position: "sticky", width: "75", right: "0.625rem", top: "0.0625rem" }}
        aria-label="Search input"
        inputProps={{
          placeholder: "Search Models...",
        }}
        onChange={searchInputChanged}
      />
        <Button onClick={ClearBoxes}>Clear</Button>
      </Flex>
      <Flex flexDirection="column" gap="3x1" alignItems="left" style={{paddingTop: "2.1875rem"}}>
        <body>{modelElements}</body>
      </Flex>
    </div>
  );
}
