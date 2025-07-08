import React from "react";
import { ColorDef, QueryRowFormat } from "@itwin/core-common";
import { IModelApp } from "@itwin/core-frontend";
import { Button, Flex } from "@itwin/itwinui-react";
import Querycompt, { type Queryprops } from "../utils/QueryCompt";
import { selectionStorage } from "../../SelectionStorage";

export function QueriesComponent() {
  const [query, setQuery] = React.useState<Queryprops>({
    id: 42,
    enabled: true,
    color: ColorDef.blue,
    query: "",
  });

  function queryChanged(newProps: Queryprops): void {
    setQuery(newProps);
  }

  function removedclick(_id: number): void {
    throw new Error("Function not implemented.");
  }

  async function selectElements(queryProps: Queryprops) {
    const iModel = IModelApp.viewManager.selectedView?.iModel;
    if (iModel) {
      try {
        const queryReader = iModel.createQueryReader(
          `SELECT [ECInstanceId] [id], ec_classname([ECClassId]) [classname] FROM [bis].[GeometricElement3d] WHERE [ECInstanceId] IN (${queryProps.query})`, undefined, {
          rowFormat: QueryRowFormat.UseJsPropertyNames,
        });
        const elements = await queryReader.toArray();
        selectionStorage.replaceSelection({
          source: "QueriesComponent", 
          selectables: elements.map((element) => ({
            id: element.id,
            className: element.classname,
          })),
          imodelKey: iModel.key,
        });
        const newQuery = { ...queryProps, valid: true, errormessage: "" };
        setQuery(newQuery);
      } catch (e: any) {
        const newQuery = { ...queryProps, valid: false, errormessage: e.message };
        setQuery(newQuery);
      }
    }
  }

  function selectClicked(): void {
    void selectElements(query);
  }

  return (
    <div>
      <Flex style={{ padding: "20px", width: "100%", height: "10px" }}>
        <h2>Enter Query that returns only ECInstanceIds</h2>
      </Flex>
      <Flex flexDirection="column" style={{ padding: "5px", width: "100%" }}>
        <Querycompt
          key={query.id}
          props={query}
          handleChange={queryChanged}
          removeClick={removedclick}
        />
        <Button onClick={selectClicked}>Run</Button>
      </Flex>
    </div>
  );
}
