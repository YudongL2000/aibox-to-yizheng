class HxTableHeadModel {
  String? name;
  int? flex;

  HxTableHeadModel(this.name, this.flex);
  HxTableHeadModel.fromJson(Map<String, dynamic> json) {
    name = json['name'];
    flex = json['flex'];
  }
}
