import 'package:flutter/material.dart';
import 'package:aitesseract/utils/ui_utils/hx_text.dart';
import 'package:aitesseract/utils/spatial_design_ref.dart';

class HxCheckboxFormField extends FormField {
  HxCheckboxFormField({
    Key? key,
    required List<dynamic> values,
    void Function(List<String>?)? onChanged,
    List<String>? initialValues,
    required valueToLabel,
  }) : super(
            key: key,
            builder: (FormFieldState field) {
              List<String> selectItems = field.value ?? initialValues ?? [];
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    children: values
                        .map((e) => UnconstrainedBox(
                              child: Row(
                                children: [
                                  Checkbox(
                                    checkColor:
                                        context.spatial.palette.textInverse,
                                    value: selectItems
                                            .indexOf(e.value as String) !=
                                        -1,
                                    onChanged: (bool? value) {
                                      if (value == true) {
                                        selectItems.add(e.value);
                                      } else {
                                        selectItems.remove(e.value);
                                      }
                                      field.didChange(selectItems);
                                      if (onChanged != null) {
                                        onChanged(selectItems);
                                      }
                                    },
                                  ),
                                  HXText(e.name)
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
                      color: context.spatial.status(SpatialStatusTone.danger),
                      fontSize: 13,
                    ),
                ],
              );
            });
}
