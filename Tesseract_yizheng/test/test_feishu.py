import lark_oapi as lark
from lark_oapi.api.im.v1 import *

client = lark.Client.builder() \
    .app_id("cli_a93c5b356d78dcc6") \
    .app_secret("v5QjmzawYi7oLMlAaEtK9fJhn1T1tZLX") \
    .build()


request = CreateMessageRequest.builder() \
    .receive_id_type("open_id") \
    .request_body(
        CreateMessageRequestBody.builder()
        .receive_id("ou_73288b58f7a9afba3b57df40a4a8e43b")
        .msg_type("text")
        .content('{"text":"hello from sdk"}')
        .build()
    ) \
    .build()


response = client.im.v1.message.create(request)


if not response.success():
    print(f"code={response.code}, msg={response.msg}, log_id={response.get_log_id()}")
else:
    print(response.data)