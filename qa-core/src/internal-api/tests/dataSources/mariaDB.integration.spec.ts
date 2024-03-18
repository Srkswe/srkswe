import TestConfiguration from "../../config/TestConfiguration"
import * as fixtures from "../../fixtures"
import { Query } from "@budibase/types"

describe("Internal API - Data Sources: MariaDB", () => {
  const config = new TestConfiguration()

  beforeAll(async () => {
    await config.beforeAll()
  })

  afterAll(async () => {
    await config.afterAll()
  })

  it("Create an app with a data source - MariaDB", async () => {
    // Create app
    await config.createApp()

    // Get all integrations
    await config.api.integrations.getAll()

    // Add data source
    const [, dataSourceJson] = await config.api.datasources.add(
      fixtures.datasources.mariaDB()
    )

    // Update data source
    const newDataSourceInfo = {
      ...dataSourceJson.datasource,
      name: "MariaDB2",
    }
    const [, updatedDataSourceJson] = await config.api.datasources.update(
      newDataSourceInfo
    )

    // Query data source
    const [, queryJson] = await config.api.queries.preview(
      fixtures.queries.mariaDB(updatedDataSourceJson.datasource._id!)
    )

    expect(queryJson.rows.length).toEqual(10)
    expect(queryJson.schemaFields).toEqual(
      fixtures.queries.expectedSchemaFields.mariaDB
    )

    // Save query
    const datasourcetoSave: Query = {
      ...fixtures.queries.mariaDB(updatedDataSourceJson.datasource._id!),
      parameters: [],
    }

    const [, saveQueryJson] = await config.api.queries.save(datasourcetoSave)
    // Get Query
    await config.api.queries.getQuery(<string>saveQueryJson._id)

    // Get Query permissions
    await config.api.permissions.getAll(saveQueryJson._id!)

    // Delete data source
    await config.api.datasources.delete(
      updatedDataSourceJson.datasource._id!,
      updatedDataSourceJson.datasource._rev!
    )
  })

  it("Create a relationship", async () => {
    // Create app
    await config.createApp()

    // Get all integrations
    await config.api.integrations.getAll()

    // Add data source
    const [, dataSourceJson] = await config.api.datasources.add(
      fixtures.datasources.mariaDB()
    )

    // Update data source
    const newDataSourceInfo = {
      ...dataSourceJson.datasource,
      name: "MariaDB2",
    }
    const [, updatedDataSourceJson] = await config.api.datasources.update(
      newDataSourceInfo
    )

    // Query data source
    const [, queryJson] = await config.api.queries.preview(
      fixtures.queries.mariaDB(updatedDataSourceJson.datasource._id!)
    )

    expect(queryJson.rows.length).toBeGreaterThan(9)
    expect(queryJson.schemaFields).toEqual(
      fixtures.queries.expectedSchemaFields.mariaDB
    )

    // Add relationship
    const relationShipBody = fixtures.datasources.generateRelationshipForMySQL(
      updatedDataSourceJson
    )
    await config.api.datasources.update(relationShipBody)
  })
})
