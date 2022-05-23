const { streamBackup } = require("../../utilities/fileSystem")
const { events } = require("@budibase/backend-core")

exports.exportAppDump = async function (ctx) {
  const { appId } = ctx.query
  const appName = decodeURI(ctx.query.appname)
  const backupIdentifier = `${appName}-export-${new Date().getTime()}.txt`
  ctx.attachment(backupIdentifier)
  ctx.body = await streamBackup(appId)
  await events.app.exported()
}
