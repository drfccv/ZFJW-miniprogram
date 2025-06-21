// pages/experience/appcase/appcase.ts

Page({
  data: {
    iosCaseData: [],
    androidCaseData: [],
  },
  onLoad() {
    this.getCaseData();
  },
  async getCaseData() {
    const casesList = [
      {
        iOS: [
          {
            "name": "旧猫",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011630593.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000ee8682008304d90d0dcc086ac0d",
            "cost": "4周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "微幕",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271947523.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/00048c397283385332c044b506640d",
            "cost": "4周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "路人王",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271946115.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/0002a2bb288928c332c0c22c066c0d",
            "cost": "1周完成",
            "paltform": "iOS",
            "dev": "全新开发"
          },
          {
            "name": "爱木头",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271944702.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/00082eb5cec8008331c03e6d06080d",
            "cost": "4周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "龟小兔拼音点读",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2Flogo.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/0004a285428c681331c0ad5056680d",
            "cost": "2周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "妈妈来了",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271941182.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000c48b4fbc398cb3ba06ffdb6c00d",
            "cost": "1周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "知结",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271948675.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000c2c6e8b0da889ee80298c266c0d",
            "cost": "3周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "星际高球联盟",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271951284.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000ee8f621cbf8a9ff702248f6680d",
            "cost": "6周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "推荐信名片",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011647878.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/0002440135c6b87f0950dfba26840d",
            "cost": "6周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "三国咸话",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011657276.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/0006a2d2f68960310430cce2e6b00d",
            "cost": "1周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "有尺物",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011654715.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000402c3b44480410430c3dee6b40d",
            "cost": "3周完成",
            "paltform": "iOS",
            "dev": "重构开发"
          },
          {
            "name": "柚子记账",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011659463.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000e6e98748a98d10430823266180d",
            "cost": "1周完成",
            "paltform": "iOS",
            "dev": "全新开发"
          },
        ],
        android: [
          {
            "name": "旧猫",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011630593.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000ee8682008304d90d0dcc086ac0d",
            "cost": "4周完成",
            "paltform": "Android",
            "dev": "重构开发"
          },
          {
            "name": "爱木头",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271944702.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/00082eb5cec8008331c03e6d06080d",
            "cost": "4周完成",
            "paltform": "Android",
            "dev": "重构开发"
          },
          {
            "name": "妈妈来了",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271941182.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000c48b4fbc398cb3ba06ffdb6c00d",
            "cost": "1周完成",
            "paltform": "Android",
            "dev": "重构开发"
          },
          {
            "name": "星际高球联盟",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202312271951284.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000ee8f621cbf8a9ff702248f6680d",
            "cost": "6周完成",
            "paltform": "Android",
            "dev": "重构开发"
          },
          {
            "name": "推荐信名片",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011647878.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/0002440135c6b87f0950dfba26840d",
            "cost": "6周完成",
            "paltform": "Android",
            "dev": "重构开发"
          },
          {
            "name": "蘑耳听力",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011650182.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/0008a88a0f0b104e763000e6a6140d",
            "cost": "1周完成",
            "paltform": "Android",
            "dev": "全新开发"
          },
          {
            "name": "有尺物",
            "icon": "https://testchu-7gy8occc8dcc14c3-1304825656.tcloudbaseapp.com/img%2Fmelody%2F202401011654715.png",
            "url": "https://developers.weixin.qq.com/community/business/doc/000402c3b44480410430c3dee6b40d",
            "cost": "3周完成",
            "paltform": "Android",
            "dev": "重构开发"
          },
        ]
      }
    ]
    const { iOS, android }: any = casesList[0];
    this.setData({
      iosCaseData: iOS,
      androidCaseData: android,
    })
  },
  toJoinGroup() {
    console.log('12345')
    console.log(123)
    wx.switchTab({
      url: '../contact/contact',
    })
  },
})