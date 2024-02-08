import fetch, { HeadersInit } from "node-fetch"
import { getFetchResponse } from "./utils"
import {
  AutomationActionStepId,
  AutomationStepSchema,
  AutomationStepInput,
  AutomationStepType,
  AutomationIOType,
  AutomationFeature,
} from "@budibase/types"

enum Method {
  GET = "get",
  POST = "post",
  PATCH = "patch",
  PUT = "put",
  HEAD = "head",
  DELETE = "delete",
}

const MethodPretty = {
  [Method.GET]: "GET",
  [Method.POST]: "POST",
  [Method.PATCH]: "PATCH",
  [Method.PUT]: "PUT",
  [Method.HEAD]: "HEAD",
  [Method.DELETE]: "DELETE",
}

export const definition: AutomationStepSchema = {
  name: "n8n Integration",
  stepTitle: "n8n",
  tagline: "Trigger an n8n workflow",
  description:
    "Performs a webhook call to n8n and gets the response (if configured)",
  icon: "ri-shut-down-line",
  stepId: AutomationActionStepId.n8n,
  type: AutomationStepType.ACTION,
  internal: false,
  features: {
    [AutomationFeature.LOOPING]: true,
  },
  inputs: {},
  schema: {
    inputs: {
      properties: {
        url: {
          type: AutomationIOType.STRING,
          title: "Webhook URL",
        },
        method: {
          type: AutomationIOType.STRING,
          title: "Method",
          enum: Object.values(Method),
          pretty: Object.values(MethodPretty),
        },
        body: {
          type: AutomationIOType.JSON,
          title: "Payload",
        },
      },
      required: ["url", "method"],
    },
    outputs: {
      properties: {
        success: {
          type: AutomationIOType.BOOLEAN,
          description: "Whether call was successful",
        },
        httpStatus: {
          type: AutomationIOType.NUMBER,
          description: "The HTTP status code returned",
        },
        response: {
          type: AutomationIOType.OBJECT,
          description: "The webhook response - this can have properties",
        },
      },
      required: ["success", "response"],
    },
  },
}

export async function run({ inputs }: AutomationStepInput) {
  const { url, body, method } = inputs

  let payload = {}
  try {
    payload = body?.value ? JSON.parse(body?.value) : {}
  } catch (err) {
    return {
      httpStatus: 400,
      response: "Invalid payload JSON",
      success: false,
    }
  }

  if (!url?.trim()?.length) {
    return {
      httpStatus: 400,
      response: "Missing Webhook URL",
      success: false,
    }
  }
  let response
  let request: {
    method: string
    headers: HeadersInit
    body?: string
  } = {
    method: method || "get",
    headers: {
      "Content-Type": "application/json",
    },
  }
  if (!["get", "head"].includes(request.method)) {
    request.body = JSON.stringify({
      ...payload,
    })
  }

  try {
    response = await fetch(url, request)
  } catch (err: any) {
    return {
      httpStatus: 400,
      response: err.message,
      success: false,
    }
  }

  const { status, message } = await getFetchResponse(response)
  return {
    httpStatus: status,
    success: status === 200,
    response: message,
  }
}
