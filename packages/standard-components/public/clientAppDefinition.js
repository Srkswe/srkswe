window["##BUDIBASE_APPDEFINITION##"] = {
  hierarchy: {
    name: "root",
    type: "root",
    children: [
      {
        name: "customer",
        type: "row",
        fields: [
          {
            name: "name",
            type: "string",
            typeOptions: {
              maxLength: 1000,
              values: null,
              allowDeclaredValuesOnly: false,
            },
            label: "name",
            getInitialValue: "default",
            getUndefinedValue: "default",
          },
        ],
        children: [
          {
            name: "invoiceyooo",
            type: "row",
            fields: [
              {
                name: "amount",
                type: "number",
                typeOptions: {
                  minValue: 99999999999,
                  maxValue: 99999999999,
                  decimalPlaces: 2,
                },
                label: "amount",
                getInitialValue: "default",
                getUndefinedValue: "default",
              },
            ],
            children: [],
            validationRules: [],
            nodeId: 2,
            indexes: [],
            allidsShardFactor: 1,
            collectionName: "invoices",
            isSingle: false,
          },
        ],
        validationRules: [],
        nodeId: 1,
        indexes: [
          {
            name: "customer_invoices",
            type: "index",
            map: "return {...row};",
            filter: "",
            indexType: "ancestor",
            getShardName: "",
            getSortKey: "row.id",
            aggregateGroups: [],
            allowedTableNodeIds: [2],
            nodeId: 5,
          },
        ],
        allidsShardFactor: 64,
        collectionName: "customers",
        isSingle: false,
      },
    ],
    pathMaps: [],
    indexes: [
      {
        name: "Yeo index",
        type: "index",
        map: "return {...row};",
        filter: "",
        indexType: "ancestor",
        getShardName: "",
        getSortKey: "row.id",
        aggregateGroups: [],
        allowedTableNodeIds: [1],
        nodeId: 4,
      },
      {
        name: "everyones_invoices",
        type: "index",
        map: "return {...row};",
        filter: "",
        indexType: "ancestor",
        getShardName: "",
        getSortKey: "row.id",
        aggregateGroups: [],
        allowedTableNodeIds: [2],
        nodeId: 6,
      },
    ],
    nodeId: 0,
  },
  componentLibraries: ["budibase-standard-components"],
  props: {},
}
