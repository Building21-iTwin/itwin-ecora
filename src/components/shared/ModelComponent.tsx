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
  const [iModel, setIModel] = useState(() => IModelApp.viewManager.selectedView?.iModel);

  // Listen for view changes and update iModel
  useEffect(() => {
    const updateIModel = () => {
      setIModel(IModelApp.viewManager.selectedView?.iModel);
    };
    IModelApp.viewManager.onSelectedViewportChanged.addListener(updateIModel);
    updateIModel();
    return () => {
      IModelApp.viewManager.onSelectedViewportChanged.removeListener(updateIModel);
    };
  }, []);

  // Fetch models when iModel changes
  useEffect(() => {
    const getModels = async () => {
      if (iModel) {
        const queryReader = iModel.createQueryReader(
          "SELECT m.ECInstanceId modelId, COALESCE(p.UserLabel, CodeValue) FROM bis.PhysicalModel m JOIN bis.PhysicalPartition p ON p.ECInstanceId = m.ModeledElement.Id WHERE m.ECInstanceId IN (SELECT DISTINCT Model.Id FROM bis.GeometricElement3d WHERE Model.Id IS NOT NULL)"
        );
        const cats = await queryReader.toArray();
        setModels(cats.map((cat) => ({ id: cat[0], label: cat[1] })));
      } else {
        setModels([]);
      }
    };
    void getModels();
  }, [iModel]);

  const handleModelChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const modelId = event.target.id;
    const isSelected = selectedModelIds.includes(modelId);
    const newSelectedIds = isSelected
      ? selectedModelIds.filter((id) => id !== modelId)
      : [...selectedModelIds, modelId];
    setSelectedModelIds(newSelectedIds);
  };

  const searchTextLower = searchString.toLowerCase();
  const filteredModels = models.filter((model) => {
    const modelLower = model.label.toLowerCase();
    return modelLower.includes(searchTextLower);
  });

  const modelElements = filteredModels.map((model) => (
    <li key={model.id} style={{ listStyle: "none", margin: "0.25rem 0", padding: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <input
        type="checkbox"
        id={model.id}
        name="model"
        checked={selectedModelIds.includes(model.id)}
        onChange={handleModelChange}
      />
      <Tooltip content="Select Model" placement="bottom">
        <label htmlFor={model.id} style={{ cursor: "pointer" }}>{model.label}</label>
      </Tooltip>
    </li>
  ));

  function searchInputChanged(event: any): void {
    setSearchString(event.target.value);
  }

  function ClearBoxes(): void {
    setSelectedModelIds([]);
  }

  return (
    <div className="">
      <Flex style={{ position: "relative", width: "98%", padding: "0.3125rem", zIndex: 1, background: "white" }}>
        <SearchBox
          className="SearchBox"
          style={{ width: "85%" }}
          aria-label="Search input"
          inputProps={{
            placeholder: "Search Models...",
          }}
          onChange={searchInputChanged}
        />
        <Button onClick={ClearBoxes}>Clear</Button>
      </Flex>
      <Flex flexDirection="column" gap="3x1" alignItems="left" style={{ paddingTop: "0.312rem" }}>
        <ul style={{ padding: 0, margin: 0 }}>{modelElements}</ul>
      </Flex>
    </div>
  );
}
