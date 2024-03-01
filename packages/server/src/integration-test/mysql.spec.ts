import fetch from "node-fetch"
import {
  generateMakeRequest,
  MakeRequestResponse,
} from "../api/routes/public/tests/utils"

import * as setup from "../api/routes/tests/utilities"
import {
  Datasource,
  FieldType,
  RelationshipType,
  Row,
  SaveTableResponse,
  Table,
  TableRequest,
  TableSourceType,
} from "@budibase/types"
import _ from "lodash"
import { generator } from "@budibase/backend-core/tests"
import { utils } from "@budibase/backend-core"
import { databaseTestProviders } from "../integrations/tests/utils"
import mysql from "mysql2/promise"
import { builderSocket } from "../websockets"
// @ts-ignore
fetch.mockSearch()

const config = setup.getConfig()!

jest.unmock("mysql2/promise")
jest.mock("../websockets", () => ({
  clientAppSocket: jest.fn(),
  gridAppSocket: jest.fn(),
  initialise: jest.fn(),
  builderSocket: {
    emitTableUpdate: jest.fn(),
    emitTableDeletion: jest.fn(),
    emitDatasourceUpdate: jest.fn(),
    emitDatasourceDeletion: jest.fn(),
    emitScreenUpdate: jest.fn(),
    emitAppMetadataUpdate: jest.fn(),
    emitAppPublish: jest.fn(),
  },
}))

describe("mysql integrations", () => {
  let makeRequest: MakeRequestResponse,
    mysqlDatasource: Datasource,
    primaryMySqlTable: Table,
    oneToManyRelationshipInfo: ForeignTableInfo,
    manyToOneRelationshipInfo: ForeignTableInfo,
    manyToManyRelationshipInfo: ForeignTableInfo

  beforeAll(async () => {
    await config.init()
    const apiKey = await config.generateApiKey()

    makeRequest = generateMakeRequest(apiKey, true)

    mysqlDatasource = await config.api.datasource.create(
      await databaseTestProviders.mysql.datasource()
    )
  })

  afterAll(async () => {
    await databaseTestProviders.mysql.stop()
  })

  beforeEach(async () => {
    async function createAuxTable(prefix: string) {
      return await config.createTable({
        name: `${prefix}_${generator.word({ length: 5 })}`,
        type: "table",
        primary: ["id"],
        primaryDisplay: "title",
        schema: {
          id: {
            name: "id",
            type: FieldType.AUTO,
            autocolumn: true,
          },
          title: {
            name: "title",
            type: FieldType.STRING,
          },
        },
        sourceId: mysqlDatasource._id,
        sourceType: TableSourceType.EXTERNAL,
      })
    }

    oneToManyRelationshipInfo = {
      table: await createAuxTable("o2m"),
      fieldName: "oneToMany",
      relationshipType: RelationshipType.ONE_TO_MANY,
    }
    manyToOneRelationshipInfo = {
      table: await createAuxTable("m2o"),
      fieldName: "manyToOne",
      relationshipType: RelationshipType.MANY_TO_ONE,
    }
    manyToManyRelationshipInfo = {
      table: await createAuxTable("m2m"),
      fieldName: "manyToMany",
      relationshipType: RelationshipType.MANY_TO_MANY,
    }

    primaryMySqlTable = await config.createTable({
      name: `p_${generator.word({ length: 5 })}`,
      type: "table",
      primary: ["id"],
      schema: {
        id: {
          name: "id",
          type: FieldType.AUTO,
          autocolumn: true,
        },
        name: {
          name: "name",
          type: FieldType.STRING,
        },
        description: {
          name: "description",
          type: FieldType.STRING,
        },
        value: {
          name: "value",
          type: FieldType.NUMBER,
        },
        oneToMany: {
          type: FieldType.LINK,
          constraints: {
            type: "array",
          },
          fieldName: oneToManyRelationshipInfo.fieldName,
          name: "oneToMany",
          relationshipType: RelationshipType.ONE_TO_MANY,
          tableId: oneToManyRelationshipInfo.table._id!,
          main: true,
        },
        manyToOne: {
          type: FieldType.LINK,
          constraints: {
            type: "array",
          },
          fieldName: manyToOneRelationshipInfo.fieldName,
          name: "manyToOne",
          relationshipType: RelationshipType.MANY_TO_ONE,
          tableId: manyToOneRelationshipInfo.table._id!,
          main: true,
        },
        manyToMany: {
          type: FieldType.LINK,
          constraints: {
            type: "array",
          },
          fieldName: manyToManyRelationshipInfo.fieldName,
          name: "manyToMany",
          relationshipType: RelationshipType.MANY_TO_MANY,
          tableId: manyToManyRelationshipInfo.table._id!,
          main: true,
        },
      },
      sourceId: mysqlDatasource._id,
      sourceType: TableSourceType.EXTERNAL,
    })
  })

  afterAll(config.end)

  function generateRandomPrimaryRowData() {
    return {
      name: generator.name(),
      description: generator.paragraph(),
      value: generator.age(),
    }
  }

  type PrimaryRowData = {
    name: string
    description: string
    value: number
  }

  type ForeignTableInfo = {
    table: Table
    fieldName: string
    relationshipType: RelationshipType
  }

  type ForeignRowsInfo = {
    row: Row
    relationshipType: RelationshipType
  }

  async function createPrimaryRow(opts: {
    rowData: PrimaryRowData
    createForeignRows?: {
      createOneToMany?: boolean
      createManyToOne?: number
      createManyToMany?: number
    }
  }) {
    let { rowData } = opts as any
    let foreignRows: ForeignRowsInfo[] = []

    if (opts?.createForeignRows?.createOneToMany) {
      const foreignKey = `fk_${oneToManyRelationshipInfo.table.name}_${oneToManyRelationshipInfo.fieldName}`

      const foreignRow = await config.createRow({
        tableId: oneToManyRelationshipInfo.table._id,
        title: generator.name(),
      })

      rowData = {
        ...rowData,
        [foreignKey]: foreignRow.id,
      }
      foreignRows.push({
        row: foreignRow,
        relationshipType: oneToManyRelationshipInfo.relationshipType,
      })
    }

    for (let i = 0; i < (opts?.createForeignRows?.createManyToOne || 0); i++) {
      const foreignRow = await config.createRow({
        tableId: manyToOneRelationshipInfo.table._id,
        title: generator.name(),
      })

      rowData = {
        ...rowData,
        [manyToOneRelationshipInfo.fieldName]:
          rowData[manyToOneRelationshipInfo.fieldName] || [],
      }
      rowData[manyToOneRelationshipInfo.fieldName].push(foreignRow._id)
      foreignRows.push({
        row: foreignRow,
        relationshipType: RelationshipType.MANY_TO_ONE,
      })
    }

    for (let i = 0; i < (opts?.createForeignRows?.createManyToMany || 0); i++) {
      const foreignRow = await config.createRow({
        tableId: manyToManyRelationshipInfo.table._id,
        title: generator.name(),
      })

      rowData = {
        ...rowData,
        [manyToManyRelationshipInfo.fieldName]:
          rowData[manyToManyRelationshipInfo.fieldName] || [],
      }
      rowData[manyToManyRelationshipInfo.fieldName].push(foreignRow._id)
      foreignRows.push({
        row: foreignRow,
        relationshipType: RelationshipType.MANY_TO_MANY,
      })
    }

    const row = await config.createRow({
      tableId: primaryMySqlTable._id,
      ...rowData,
    })

    return { row, foreignRows }
  }

  async function createDefaultMySqlTable() {
    return await config.createTable({
      name: generator.word({ length: 10 }),
      type: "table",
      primary: ["id"],
      schema: {
        id: {
          name: "id",
          type: FieldType.AUTO,
          autocolumn: true,
        },
      },
      sourceId: mysqlDatasource._id,
      sourceType: TableSourceType.EXTERNAL,
    })
  }

  const createRandomTableWithRows = async () => {
    const tableId = (await createDefaultMySqlTable())._id!
    return await config.api.row.save(tableId, {
      tableId,
      title: generator.name(),
    })
  }

  async function populatePrimaryRows(
    count: number,
    opts?: {
      createOneToMany?: boolean
      createManyToOne?: number
      createManyToMany?: number
    }
  ) {
    return await Promise.all(
      Array(count)
        .fill({})
        .map(async () => {
          const rowData = generateRandomPrimaryRowData()
          return {
            rowData,
            ...(await createPrimaryRow({
              rowData,
              createForeignRows: opts,
            })),
          }
        })
    )
  }

  it("validate table schema", async () => {
    const res = await makeRequest(
      "get",
      `/api/datasources/${mysqlDatasource._id}`
    )

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      config: {
        database: "mysql",
        host: mysqlDatasource.config!.host,
        password: "--secret-value--",
        port: mysqlDatasource.config!.port,
        user: "root",
      },
      plus: true,
      source: "MYSQL",
      type: "datasource_plus",
      _id: expect.any(String),
      _rev: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      entities: expect.any(Object),
    })
  })

  describe("POST /api/:tableId/rows", () => {
    const createRow = (tableId: string | undefined, body: object) =>
      makeRequest("post", `/api/${tableId}/rows`, body)

    describe("given that no row exists", () => {
      it("adding a new one persists it", async () => {
        const newRow = generateRandomPrimaryRowData()

        const res = await createRow(primaryMySqlTable._id, newRow)

        expect(res.status).toBe(200)

        const persistedRows = await config.getRows(primaryMySqlTable._id!)
        expect(persistedRows).toHaveLength(1)

        const expected = {
          ...res.body,
          ...newRow,
        }

        expect(persistedRows).toEqual([expect.objectContaining(expected)])
      })

      it("multiple rows can be persisted", async () => {
        const numberOfRows = 10
        const newRows: Row[] = Array(numberOfRows).fill(
          generateRandomPrimaryRowData()
        )

        await Promise.all(
          newRows.map(async newRow => {
            const res = await createRow(primaryMySqlTable._id, newRow)
            expect(res.status).toBe(200)
          })
        )

        const persistedRows = await config.getRows(primaryMySqlTable._id!)
        expect(persistedRows).toHaveLength(numberOfRows)
        expect(persistedRows).toEqual(
          expect.arrayContaining(newRows.map(expect.objectContaining))
        )
      })
    })
  })

  describe("PATCH /api/:tableId/rows", () => {
    const updateRow = (tableId: string | undefined, body: Row) =>
      makeRequest("patch", `/api/${tableId}/rows`, body)

    describe("given than a row exists", () => {
      let row: Row
      beforeEach(async () => {
        let rowResponse = _.sample(await populatePrimaryRows(1))!
        row = rowResponse.row
      })

      it("updating it persists it", async () => {
        const newName = generator.name()
        const newValue = generator.age()
        const updatedRow = {
          ...row,
          name: newName,
          value: newValue,
        }

        const res = await updateRow(primaryMySqlTable._id, updatedRow)

        expect(res.status).toBe(200)
        expect(res.body).toEqual(updatedRow)

        const persistedRow = await config.getRow(primaryMySqlTable._id!, row.id)

        expect(persistedRow).toEqual(
          expect.objectContaining({
            id: row.id,
            name: newName,
            value: newValue,
          })
        )
      })
    })
  })

  describe("DELETE /api/:tableId/rows", () => {
    const deleteRow = (
      tableId: string | undefined,
      body: Row | { rows: Row[] }
    ) => makeRequest("delete", `/api/${tableId}/rows`, body)

    describe("given than multiple row exist", () => {
      const numberOfInitialRows = 5
      let rows: Row[]
      beforeEach(async () => {
        rows = (await populatePrimaryRows(numberOfInitialRows)).map(x => x.row)
      })

      it("delete request removes it", async () => {
        const row = _.sample(rows)!
        const res = await deleteRow(primaryMySqlTable._id, row)

        expect(res.status).toBe(200)

        const persistedRows = await config.getRows(primaryMySqlTable._id!)
        expect(persistedRows).toHaveLength(numberOfInitialRows - 1)

        expect(row.id).toBeDefined()
        expect(persistedRows).not.toContain(
          expect.objectContaining({ _id: row.id })
        )
      })

      it("multiple rows can be removed at once", async () => {
        let rowsToDelete = _.sampleSize(rows, 3)!

        const res = await deleteRow(primaryMySqlTable._id, {
          rows: rowsToDelete,
        })

        expect(res.status).toBe(200)

        const persistedRows = await config.getRows(primaryMySqlTable._id!)
        expect(persistedRows).toHaveLength(numberOfInitialRows - 3)

        for (const row of rowsToDelete) {
          expect(persistedRows).not.toContain(
            expect.objectContaining({ _id: row.id })
          )
        }
      })
    })
  })

  describe("GET /api/:tableId/rows/:rowId", () => {
    const getRow = (tableId: string | undefined, rowId?: string | undefined) =>
      makeRequest("get", `/api/${tableId}/rows/${rowId}`)

    describe("given than a table have a single row", () => {
      let rowData: PrimaryRowData, row: Row
      beforeEach(async () => {
        const [createdRow] = await populatePrimaryRows(1)
        rowData = createdRow.rowData
        row = createdRow.row
      })

      it("the row can be retrieved successfully", async () => {
        const res = await getRow(primaryMySqlTable._id, row.id)

        expect(res.status).toBe(200)

        expect(res.body).toEqual(expect.objectContaining(rowData))
      })
    })

    describe("given than a table have a multiple rows", () => {
      let rows: { row: Row; rowData: PrimaryRowData }[]

      beforeEach(async () => {
        rows = await populatePrimaryRows(5)
      })

      it("a single row can be retrieved successfully", async () => {
        const { rowData, row } = _.sample(rows)!

        const res = await getRow(primaryMySqlTable._id, row.id)

        expect(res.status).toBe(200)

        expect(res.body).toEqual(expect.objectContaining(rowData))
      })
    })

    describe("given a row with relation data", () => {
      let row: Row
      let rowData: {
        name: string
        description: string
        value: number
      }
      let foreignRows: ForeignRowsInfo[]

      describe("with all relationship types", () => {
        beforeEach(async () => {
          let [createdRow] = await populatePrimaryRows(1, {
            createOneToMany: true,
            createManyToOne: 3,
            createManyToMany: 2,
          })
          row = createdRow.row
          rowData = createdRow.rowData
          foreignRows = createdRow.foreignRows
        })

        it("only one to primary keys are retrieved", async () => {
          const res = await getRow(primaryMySqlTable._id, row.id)

          expect(res.status).toBe(200)

          const one2ManyForeignRows = foreignRows.filter(
            x => x.relationshipType === RelationshipType.ONE_TO_MANY
          )
          const many2OneForeignRows = foreignRows.filter(
            x => x.relationshipType === RelationshipType.MANY_TO_ONE
          )
          const many2ManyForeignRows = foreignRows.filter(
            x => x.relationshipType === RelationshipType.MANY_TO_MANY
          )
          expect(one2ManyForeignRows).toHaveLength(1)

          expect(res.body).toEqual({
            ...rowData,
            id: row.id,
            tableId: row.tableId,
            _id: expect.any(String),
            _rev: expect.any(String),
            [`fk_${oneToManyRelationshipInfo.table.name}_${oneToManyRelationshipInfo.fieldName}`]:
              one2ManyForeignRows[0].row.id,
            [oneToManyRelationshipInfo.fieldName]: expect.arrayContaining(
              one2ManyForeignRows.map(r => ({
                _id: r.row._id,
                primaryDisplay: r.row.title,
              }))
            ),
            [manyToOneRelationshipInfo.fieldName]: expect.arrayContaining(
              many2OneForeignRows.map(r => ({
                _id: r.row._id,
                primaryDisplay: r.row.title,
              }))
            ),
            [manyToManyRelationshipInfo.fieldName]: expect.arrayContaining(
              many2ManyForeignRows.map(r => ({
                _id: r.row._id,
                primaryDisplay: r.row.title,
              }))
            ),
          })
        })
      })

      describe("with only one to many", () => {
        beforeEach(async () => {
          let [createdRow] = await populatePrimaryRows(1, {
            createOneToMany: true,
          })
          row = createdRow.row
          rowData = createdRow.rowData
          foreignRows = createdRow.foreignRows
        })

        it("only one to many foreign keys are retrieved", async () => {
          const res = await getRow(primaryMySqlTable._id, row.id)

          expect(res.status).toBe(200)

          expect(foreignRows).toHaveLength(1)

          expect(res.body).toEqual({
            ...rowData,
            id: row.id,
            tableId: row.tableId,
            _id: expect.any(String),
            _rev: expect.any(String),
            [`fk_${oneToManyRelationshipInfo.table.name}_${oneToManyRelationshipInfo.fieldName}`]:
              foreignRows[0].row.id,
            [oneToManyRelationshipInfo.fieldName]: expect.arrayContaining(
              foreignRows.map(r => ({
                _id: r.row._id,
                primaryDisplay: r.row.title,
              }))
            ),
          })
        })
      })

      describe("with only many to one", () => {
        beforeEach(async () => {
          let [createdRow] = await populatePrimaryRows(1, {
            createManyToOne: 3,
          })
          row = createdRow.row
          rowData = createdRow.rowData
          foreignRows = createdRow.foreignRows
        })

        it("only one to many foreign keys are retrieved", async () => {
          const res = await getRow(primaryMySqlTable._id, row.id)

          expect(res.status).toBe(200)

          expect(foreignRows).toHaveLength(3)

          expect(res.body).toEqual({
            ...rowData,
            id: row.id,
            tableId: row.tableId,
            _id: expect.any(String),
            _rev: expect.any(String),
            [manyToOneRelationshipInfo.fieldName]: expect.arrayContaining(
              foreignRows.map(r => ({
                _id: r.row._id,
                primaryDisplay: r.row.title,
              }))
            ),
          })
        })
      })

      describe("with only many to many", () => {
        beforeEach(async () => {
          let [createdRow] = await populatePrimaryRows(1, {
            createManyToMany: 2,
          })
          row = createdRow.row
          rowData = createdRow.rowData
          foreignRows = createdRow.foreignRows
        })

        it("only one to many foreign keys are retrieved", async () => {
          const res = await getRow(primaryMySqlTable._id, row.id)

          expect(res.status).toBe(200)

          expect(foreignRows).toHaveLength(2)

          expect(res.body).toEqual({
            ...rowData,
            id: row.id,
            tableId: row.tableId,
            _id: expect.any(String),
            _rev: expect.any(String),
            [manyToManyRelationshipInfo.fieldName]: expect.arrayContaining(
              foreignRows.map(r => ({
                _id: r.row._id,
                primaryDisplay: r.row.title,
              }))
            ),
          })
        })
      })
    })
  })

  describe("POST /api/:tableId/search", () => {
    const search = (tableId: string | undefined, body?: object) =>
      makeRequest("post", `/api/${tableId}/search`, body)

    describe("search without parameters", () => {
      describe("given than a table has no rows", () => {
        it("search without query returns empty", async () => {
          const res = await search(primaryMySqlTable._id)

          expect(res.status).toBe(200)

          expect(res.body).toEqual({
            rows: [],
            bookmark: null,
            hasNextPage: false,
          })
        })
      })

      describe("given than a table has multiple rows", () => {
        const rowsCount = 6
        let rows: {
          row: Row
          rowData: PrimaryRowData
        }[]
        beforeEach(async () => {
          rows = await populatePrimaryRows(rowsCount)
        })

        it("search without query returns all of them", async () => {
          const res = await search(primaryMySqlTable._id)

          expect(res.status).toBe(200)

          expect(res.body).toEqual({
            rows: expect.arrayContaining(
              rows.map(r => expect.objectContaining(r.rowData))
            ),
            bookmark: null,
            hasNextPage: false,
          })
          expect(res.body.rows).toHaveLength(rowsCount)
        })
      })

      describe("given than multiple tables have multiple rows", () => {
        const rowsCount = 6
        beforeEach(async () => {
          await createRandomTableWithRows()
          await createRandomTableWithRows()

          await populatePrimaryRows(rowsCount)

          await createRandomTableWithRows()
        })
        it("search only return the requested ones", async () => {
          const res = await search(primaryMySqlTable._id)

          expect(res.status).toBe(200)

          expect(res.body.rows).toHaveLength(rowsCount)
        })
      })
    })

    it("Querying by a string field returns the rows with field containing or starting by that value", async () => {
      const name = generator.name()
      const rowsToFilter = [
        ...Array(2).fill({
          name,
          description: generator.paragraph(),
          value: generator.age(),
        }),
        ...Array(2).fill({
          name: `${name}${utils.newid()}`,
          description: generator.paragraph(),
          value: generator.age(),
        }),
      ]

      await populatePrimaryRows(3)
      for (const row of rowsToFilter) {
        await createPrimaryRow({
          rowData: row,
        })
      }
      await populatePrimaryRows(1)

      const res = await search(primaryMySqlTable._id, {
        query: {
          string: {
            name,
          },
        },
      })

      expect(res.status).toBe(200)

      expect(res.body).toEqual({
        rows: expect.arrayContaining(rowsToFilter.map(expect.objectContaining)),
        bookmark: null,
        hasNextPage: false,
      })
      expect(res.body.rows).toHaveLength(4)
    })

    it("Querying respects the limit fields", async () => {
      await populatePrimaryRows(6)

      const res = await search(primaryMySqlTable._id, {
        limit: 2,
      })

      expect(res.status).toBe(200)

      expect(res.body.rows).toHaveLength(2)
    })

    describe("sort", () => {
      beforeEach(async () => {
        const defaultValue = generateRandomPrimaryRowData()

        await createPrimaryRow({
          rowData: {
            ...defaultValue,
            name: "d",
            value: 3,
          },
        })
        await createPrimaryRow({
          rowData: { ...defaultValue, name: "aaa", value: 40 },
        })
        await createPrimaryRow({
          rowData: { ...defaultValue, name: "ccccc", value: -5 },
        })
        await createPrimaryRow({
          rowData: { ...defaultValue, name: "bb", value: 0 },
        })
      })

      it("Querying respects the sort order when sorting ascending by a string value", async () => {
        const res = await search(primaryMySqlTable._id, {
          sort: "name",
          sortOrder: "ascending",
          sortType: "string",
        })

        expect(res.status).toBe(200)
        expect(res.body.rows).toEqual([
          expect.objectContaining({ name: "aaa" }),
          expect.objectContaining({ name: "bb" }),
          expect.objectContaining({ name: "ccccc" }),
          expect.objectContaining({ name: "d" }),
        ])
      })

      it("Querying respects the sort order when sorting descending by a string value", async () => {
        const res = await search(primaryMySqlTable._id, {
          sort: "name",
          sortOrder: "descending",
          sortType: "string",
        })

        expect(res.status).toBe(200)
        expect(res.body.rows).toEqual([
          expect.objectContaining({ name: "d" }),
          expect.objectContaining({ name: "ccccc" }),
          expect.objectContaining({ name: "bb" }),
          expect.objectContaining({ name: "aaa" }),
        ])
      })

      it("Querying respects the sort order when sorting ascending by a numeric value", async () => {
        const res = await search(primaryMySqlTable._id, {
          sort: "value",
          sortOrder: "ascending",
          sortType: "number",
        })

        expect(res.status).toBe(200)
        expect(res.body.rows).toEqual([
          expect.objectContaining({ value: -5 }),
          expect.objectContaining({ value: 0 }),
          expect.objectContaining({ value: 3 }),
          expect.objectContaining({ value: 40 }),
        ])
      })

      it("Querying respects the sort order when sorting descending by a numeric value", async () => {
        const res = await search(primaryMySqlTable._id, {
          sort: "value",
          sortOrder: "descending",
          sortType: "number",
        })

        expect(res.status).toBe(200)
        expect(res.body.rows).toEqual([
          expect.objectContaining({ value: 40 }),
          expect.objectContaining({ value: 3 }),
          expect.objectContaining({ value: 0 }),
          expect.objectContaining({ value: -5 }),
        ])
      })
    })
  })

  describe("GET /api/:tableId/:rowId/enrich", () => {
    const getAll = (tableId: string | undefined, rowId: string | undefined) =>
      makeRequest("get", `/api/${tableId}/${rowId}/enrich`)
    describe("given a row with relation data", () => {
      let row: Row, rowData: PrimaryRowData, foreignRows: ForeignRowsInfo[]

      describe("with all relationship types", () => {
        beforeEach(async () => {
          rowData = generateRandomPrimaryRowData()
          const rowsInfo = await createPrimaryRow({
            rowData,
            createForeignRows: {
              createOneToMany: true,
              createManyToOne: 3,
              createManyToMany: 2,
            },
          })

          row = rowsInfo.row
          foreignRows = rowsInfo.foreignRows
        })

        it("enrich populates the foreign fields", async () => {
          const res = await getAll(primaryMySqlTable._id, row.id)

          expect(res.status).toBe(200)

          const foreignRowsByType = _.groupBy(
            foreignRows,
            x => x.relationshipType
          )
          const m2mFieldName = manyToManyRelationshipInfo.fieldName,
            o2mFieldName = oneToManyRelationshipInfo.fieldName,
            m2oFieldName = manyToOneRelationshipInfo.fieldName
          const m2mRow1 = res.body[m2mFieldName].find(
            (row: Row) => row.id === 1
          )
          const m2mRow2 = res.body[m2mFieldName].find(
            (row: Row) => row.id === 2
          )
          expect(m2mRow1).toEqual({
            ...foreignRowsByType[RelationshipType.MANY_TO_MANY][0].row,
            [m2mFieldName]: [
              {
                _id: row._id,
              },
            ],
          })
          expect(m2mRow2).toEqual({
            ...foreignRowsByType[RelationshipType.MANY_TO_MANY][1].row,
            [m2mFieldName]: [
              {
                _id: row._id,
              },
            ],
          })
          const m2oRel = {
            [m2oFieldName]: [
              {
                _id: row._id,
              },
            ],
          }
          expect(res.body[m2oFieldName]).toEqual([
            {
              ...m2oRel,
              ...foreignRowsByType[RelationshipType.MANY_TO_ONE][0].row,
              [`fk_${manyToOneRelationshipInfo.table.name}_${manyToOneRelationshipInfo.fieldName}`]:
                row.id,
            },
            {
              ...m2oRel,
              ...foreignRowsByType[RelationshipType.MANY_TO_ONE][1].row,
              [`fk_${manyToOneRelationshipInfo.table.name}_${manyToOneRelationshipInfo.fieldName}`]:
                row.id,
            },
            {
              ...m2oRel,
              ...foreignRowsByType[RelationshipType.MANY_TO_ONE][2].row,
              [`fk_${manyToOneRelationshipInfo.table.name}_${manyToOneRelationshipInfo.fieldName}`]:
                row.id,
            },
          ])
          const o2mRel = {
            [o2mFieldName]: [
              {
                _id: row._id,
              },
            ],
          }
          expect(res.body[o2mFieldName]).toEqual([
            {
              ...o2mRel,
              ...foreignRowsByType[RelationshipType.ONE_TO_MANY][0].row,
              _id: expect.any(String),
              _rev: expect.any(String),
            },
          ])
        })
      })
    })
  })

  describe("GET /api/:tableId/rows", () => {
    const getAll = (tableId: string | undefined) =>
      makeRequest("get", `/api/${tableId}/rows`)

    describe("given a table with no rows", () => {
      it("get request returns empty", async () => {
        const res = await getAll(primaryMySqlTable._id)

        expect(res.status).toBe(200)

        expect(res.body).toHaveLength(0)
      })
    })
    describe("given a table with multiple rows", () => {
      const rowsCount = 6
      let rows: {
        row: Row
        foreignRows: ForeignRowsInfo[]
        rowData: PrimaryRowData
      }[]
      beforeEach(async () => {
        rows = await populatePrimaryRows(rowsCount)
      })

      it("get request returns all of them", async () => {
        const res = await getAll(primaryMySqlTable._id)

        expect(res.status).toBe(200)

        expect(res.body).toHaveLength(rowsCount)
        expect(res.body).toEqual(
          expect.arrayContaining(
            rows.map(r => expect.objectContaining(r.rowData))
          )
        )
      })
    })

    describe("given multiple tables with multiple rows", () => {
      const rowsCount = 6

      beforeEach(async () => {
        await createRandomTableWithRows()
        await populatePrimaryRows(rowsCount)
        await createRandomTableWithRows()
      })

      it("get returns the requested ones", async () => {
        const res = await getAll(primaryMySqlTable._id)

        expect(res.status).toBe(200)

        expect(res.body).toHaveLength(rowsCount)
      })
    })
  })

  describe("POST /api/datasources/verify", () => {
    it("should be able to verify the connection", async () => {
      const response = await config.api.datasource.verify({
        datasource: await databaseTestProviders.mysql.datasource(),
      })
      expect(response.status).toBe(200)
      expect(response.body.connected).toBe(true)
    })

    it("should state an invalid datasource cannot connect", async () => {
      const dbConfig = await databaseTestProviders.mysql.datasource()
      const response = await config.api.datasource.verify({
        datasource: {
          ...dbConfig,
          config: {
            ...dbConfig.config,
            password: "wrongpassword",
          },
        },
      })

      expect(response.status).toBe(200)
      expect(response.body.connected).toBe(false)
      expect(response.body.error).toBeDefined()
    })
  })

  describe("POST /api/datasources/info", () => {
    it("should fetch information about mysql datasource", async () => {
      const primaryName = primaryMySqlTable.name
      const response = await makeRequest("post", "/api/datasources/info", {
        datasource: mysqlDatasource,
      })
      expect(response.status).toBe(200)
      expect(response.body.tableNames).toBeDefined()
      expect(response.body.tableNames.indexOf(primaryName)).not.toBe(-1)
    })
  })

  describe("POST /api/datasources/:datasourceId/schema", () => {
    let client: mysql.Connection

    beforeEach(async () => {
      client = await mysql.createConnection(
        (
          await databaseTestProviders.mysql.datasource()
        ).config!
      )
    })

    afterEach(async () => {
      await client.query("DROP TABLE IF EXISTS `table`")
      await client.end()
    })

    it("recognises when a table has no primary key", async () => {
      await client.query("CREATE TABLE `table` (log text)")

      const response = await makeRequest(
        "post",
        `/api/datasources/${mysqlDatasource._id}/schema`
      )

      expect(response.body.errors).toEqual({
        table: "Table must have a primary key.",
        general_log: "Table must have a primary key.",
        slow_log: "Table must have a primary key.",
      })
    })

    it("recognises when a table is using a reserved column name", async () => {
      await client.query("CREATE TABLE `table` (_id SERIAL PRIMARY KEY) ")

      const response = await makeRequest(
        "post",
        `/api/datasources/${mysqlDatasource._id}/schema`
      )

      expect(response.body.errors).toEqual({
        table: "Table contains invalid columns.",
        general_log: "Table must have a primary key.",
        slow_log: "Table must have a primary key.",
      })
    })
  })

  describe("Integration compatibility with mysql search_path", () => {
    let client: mysql.Connection, pathDatasource: Datasource
    const database = "test1"
    const database2 = "test-2"

    beforeAll(async () => {
      const dsConfig = await databaseTestProviders.mysql.datasource()
      const dbConfig = dsConfig.config!

      client = await mysql.createConnection(dbConfig)
      await client.query(`CREATE DATABASE \`${database}\`;`)
      await client.query(`CREATE DATABASE \`${database2}\`;`)

      const pathConfig: any = {
        ...dsConfig,
        config: {
          ...dbConfig,
          database,
        },
      }
      pathDatasource = await config.api.datasource.create(pathConfig)
    })

    afterAll(async () => {
      await client.query(`DROP DATABASE \`${database}\`;`)
      await client.query(`DROP DATABASE \`${database2}\`;`)
      await client.end()
    })

    it("discovers tables from any schema in search path", async () => {
      await client.query(
        `CREATE TABLE \`${database}\`.table1 (id1 SERIAL PRIMARY KEY);`
      )
      const response = await makeRequest("post", "/api/datasources/info", {
        datasource: pathDatasource,
      })
      expect(response.status).toBe(200)
      expect(response.body.tableNames).toBeDefined()
      expect(response.body.tableNames).toEqual(
        expect.arrayContaining(["table1"])
      )
    })

    it("does not mix columns from different tables", async () => {
      const repeated_table_name = "table_same_name"
      await client.query(
        `CREATE TABLE \`${database}\`.${repeated_table_name} (id SERIAL PRIMARY KEY, val1 TEXT);`
      )
      await client.query(
        `CREATE TABLE \`${database2}\`.${repeated_table_name} (id2 SERIAL PRIMARY KEY, val2 TEXT);`
      )
      const response = await makeRequest(
        "post",
        `/api/datasources/${pathDatasource._id}/schema`,
        {
          tablesFilter: [repeated_table_name],
        }
      )
      expect(response.status).toBe(200)
      expect(
        response.body.datasource.entities[repeated_table_name].schema
      ).toBeDefined()
      const schema =
        response.body.datasource.entities[repeated_table_name].schema
      expect(Object.keys(schema).sort()).toEqual(["id", "val1"])
    })
  })

  describe("POST /api/tables/", () => {
    let client: mysql.Connection
    const emitDatasourceUpdateMock = jest.fn()

    beforeEach(async () => {
      client = await mysql.createConnection(
        (
          await databaseTestProviders.mysql.datasource()
        ).config!
      )
    })

    afterEach(async () => {
      await client.end()
    })

    it("will emit the datasource entity schema with externalType to the front-end when adding a new column", async () => {
      mysqlDatasource = (
        await makeRequest(
          "post",
          `/api/datasources/${mysqlDatasource._id}/schema`
        )
      ).body.datasource

      const addColumnToTable: TableRequest = {
        type: "table",
        sourceType: TableSourceType.EXTERNAL,
        name: "table",
        sourceId: mysqlDatasource._id!,
        primary: ["id"],
        schema: {
          id: {
            type: FieldType.AUTO,
            name: "id",
            autocolumn: true,
          },
          new_column: {
            type: FieldType.NUMBER,
            name: "new_column",
          },
        },
        _add: {
          name: "new_column",
        },
      }

      jest
        .spyOn(builderSocket!, "emitDatasourceUpdate")
        .mockImplementation(emitDatasourceUpdateMock)

      await makeRequest("post", "/api/tables/", addColumnToTable)

      const expectedTable: TableRequest = {
        ...addColumnToTable,
        schema: {
          id: {
            type: FieldType.NUMBER,
            name: "id",
            autocolumn: true,
            constraints: {
              presence: false,
            },
            externalType: "int unsigned",
          },
          new_column: {
            type: FieldType.NUMBER,
            name: "new_column",
            autocolumn: false,
            constraints: {
              presence: false,
            },
            externalType: "float(8,2)",
          },
        },
        created: true,
        _id: `${mysqlDatasource._id}__table`,
      }
      delete expectedTable._add

      expect(emitDatasourceUpdateMock).toBeCalledTimes(1)
      const emittedDatasource: Datasource =
        emitDatasourceUpdateMock.mock.calls[0][1]
      expect(emittedDatasource.entities!["table"]).toEqual(expectedTable)
    })
  })
})
