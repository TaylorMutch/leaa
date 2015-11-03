__author__ = 'Taylor'
from django.conf.urls import url
from leaa import visViews


urlpatterns = [
    url(r'^getTerrain', visViews.getTerrain),
    url(r'^getDates/', visViews.getDates),
    url(r'^getStationObjects/', visViews.getStationObjects),
    ]
