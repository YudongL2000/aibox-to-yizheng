/*
 * @Description: insert description
 * @Author: yangrongxin
 * @Date: 2025-02-25 17:58:52
 * @LastEditors: yangrongxin
 * @LastEditTime: 2025-02-26 14:17:21
 */
import 'package:flutter/material.dart';

import 'hx_text.dart';

class HxRadioOptions {
  String name = '';
  String value = '';
  HxRadioOptions({
    required this.name,
    required this.value
  });
}

class HxRadioFormField<T> extends FormField<T> {
  final Map<String, dynamic>? valueToLabel;

  HxRadioFormField({
    Key? key,
    FormFieldValidator<T?>? validator,
    T? initialValue,
    // 使用radio中定义的类型
    required List<T> values,
    this.valueToLabel,
    void Function(T?)? onChanged,
    void Function(T?)? onSaved,
    bool enabled = true,
    AutovalidateMode autovalidateMode = AutovalidateMode.disabled,
  }) : super(
    key: key,
    initialValue: initialValue,
    validator: validator,
    onSaved: onSaved,
    enabled: enabled,
    autovalidateMode: autovalidateMode,
    builder: (FormFieldState<T> field) {
      T? fieldValue = field.value;
      print("radio_form_field $fieldValue");
      return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              children: values
                  .map((e) => UnconstrainedBox(
                        child: Row(
                          children: [
                            Radio<T>(
                              value: e,
                              groupValue: field.value,
                              onChanged: (T? newValue) {
                                if (newValue != null) {
                                  field.didChange(newValue);
                                  if (
                                   onChanged != null
                                  ) {
                                    onChanged(newValue);
                                  }
                                }
                              },
                            ),
                            // 展示radio的标题
                            HXText(valueToLabel != null ? valueToLabel[e.toString()] ?? e.toString() : e.toString()),
                          ],
                        ),
                      ))
                  .toList(),
            ),
            // 展示验证的错误信息
            if (field.hasError)
              SizedBox(
                height: 8,
              ),
            if (field.hasError)
              HXText(
                field.errorText ?? '',
                color: Colors.red,
                fontSize: 13,
              ),
          ]);
    });
}
