import { ToolDocumentation } from '../types';

export const n8nTestWorkflowDoc: ToolDocumentation = {
  name: 'n8n_test_workflow',
  category: 'workflow_management',
  essentials: {
    description: 'Test/trigger workflow execution via webhook. Only workflows with webhook triggers can be executed externally.',
    keyParameters: ['workflowId', 'webhookPath', 'httpMethod', 'data'],
    example: 'n8n_test_workflow({workflowId: "123"}) - trigger webhook',
    performance: 'Immediate trigger, response time depends on workflow complexity',
    tips: [
      'Workflow must include a webhook trigger node',
      'Set N8N_PUBLIC_URL so the webhook URL can be constructed',
      'Activate the workflow before testing'
    ]
  },
  full: {
    description: `Test and trigger n8n workflows through HTTP webhook execution.

**Trigger Types:**
- **webhook**: HTTP-based triggers (GET/POST/PUT/DELETE)

**Important:** Only workflows with webhook triggers can be executed externally. Workflows with schedule, manual, or other trigger types cannot be triggered via this API.`,
    parameters: {
      workflowId: {
        type: 'string',
        required: true,
        description: 'Workflow ID to execute'
      },
      triggerType: {
        type: 'string',
        required: false,
        enum: ['webhook'],
        description: 'Trigger type. Only webhook is supported in this build.'
      },
      httpMethod: {
        type: 'string',
        required: false,
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'For webhook: HTTP method (default: from workflow config or POST)'
      },
      webhookPath: {
        type: 'string',
        required: false,
        description: 'For webhook: override the webhook path'
      },
      data: {
        type: 'object',
        required: false,
        description: 'Input data/payload for webhook'
      },
      headers: {
        type: 'object',
        required: false,
        description: 'Custom HTTP headers'
      },
      timeout: {
        type: 'number',
        required: false,
        description: 'Timeout in ms (default: 120000)'
      },
      waitForResponse: {
        type: 'boolean',
        required: false,
        description: 'Wait for workflow completion (default: true)'
      }
    },
    returns: `Execution response including:
- success: boolean
- data: webhook response data
- details: triggerType + webhookUrl`,
    examples: [
      'n8n_test_workflow({workflowId: "123"}) - Trigger webhook',
      'n8n_test_workflow({workflowId: "123", triggerType: "webhook", data: {name: "John"}}) - Webhook with data',
      'n8n_test_workflow({workflowId: "123", webhookPath: "/my-hook", httpMethod: "POST"}) - Override path/method'
    ],
    useCases: [
      'Test workflows during development',
      'Integrate n8n workflows with external systems via webhooks'
    ],
    performance: `Performance varies based on workflow complexity and waitForResponse setting:
- Webhook: Immediate trigger, depends on workflow`,
    errorHandling: `**Error Response with Execution Guidance**

When execution fails, the response includes guidance for debugging:

**With Execution ID** (workflow started but failed):
- Use n8n_executions({action: 'get', id: executionId, mode: 'preview'}) to investigate

**Without Execution ID** (workflow didn't start):
- Use n8n_executions({action: 'list', workflowId: 'wf_id'}) to find recent executions

**Common Errors:**
- "Workflow not found" - Check workflow ID exists
- "Workflow not active" - Activate workflow (required for webhook triggers)
- "Workflow has no webhook trigger" - Add a webhook trigger node
- "Webhook path not found" - Set a path on the webhook node or pass webhookPath
- "SSRF protection" - URL validation failed`,
    bestPractices: [
      'Ensure workflow has a webhook trigger before testing',
      'Use mode="preview" with n8n_executions for efficient debugging',
      'Test with small data payloads first',
      'Activate workflows before testing (use n8n_update_partial_workflow with activateWorkflow)'
    ],
    pitfalls: [
      'Webhook triggers require the workflow to be ACTIVE',
      'Workflows without webhook triggers cannot be executed externally',
      'Webhook method must match node configuration'
    ],
    relatedTools: ['n8n_executions', 'n8n_get_workflow', 'n8n_create_workflow', 'n8n_validate_workflow']
  }
};
