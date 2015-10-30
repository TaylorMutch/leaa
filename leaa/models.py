from django.db import models
from django.contrib.auth.models import User
# Create your models here.

# Contains info specific to the Terrain that needs to be generated
class Terrain(models.Model):
    name = models.CharField(max_length=100)
    MAPx = models.IntegerField()
    MAPy = models.IntegerField()
    DEMx = models.IntegerField()
    DEMy = models.IntegerField()
    maxHeight = models.IntegerField()
    #user = models.ManyToManyField(User)
    fileName = models.CharField(max_length=100)
    north_lat = models.FloatField()
    south_lat = models.FloatField()
    east_lng = models.FloatField()
    west_lng = models.FloatField()

    def __str__(self):
        return self.name

# Contains Latitude/Longitude to orient the station with a terrain
class Station(models.Model):
    name    = models.CharField(max_length=100)
    lat     = models.FloatField()
    long    = models.FloatField()
    demX    = models.IntegerField()
    demY    = models.IntegerField()
    terrain = models.ForeignKey('Terrain')

    def __str__(self):
        return self.name


def datafile_directory_path(instance, filename):
    return '{0}/{1}/{2}/{3}'.format(instance.terrain.name,instance.station.name,instance.creationDate[:4], filename)

# Mimic a .SDR file, we collect the initial and ending timestamp from the file (first/last)
class DataFile(models.Model):
    creationDate = models.DateField(auto_now_add=False)
    station = models.ForeignKey('Station')
    terrain = models.ForeignKey('Terrain')
    fileName = models.CharField(max_length=50)
    #filePath = models.FileField(upload_to=datafile_directory_path)

    def __str__(self):
        return str(self.creationDate)


class Setting(models.Model):
    vectorLength = models.IntegerField()
    vectorHeight = models.IntegerField()
    vectorColor = models.CharField(max_length=8) # hex colors are only 8 characters long
    terrainScale = models.IntegerField()
    animationSpeed = models.IntegerField()
    user = models.OneToOneField(User, primary_key=True)

    def __str__(self):
        user_name = "testname"
        return user_name + ' ' + str(self.user_id)

class TerrainView(models.Model):
    controlPos = (models.FloatField(), models.FloatField(), models.FloatField())
    cameraPos = (models.FloatField(), models.FloatField(), models.FloatField())
    worldPos = (models.FloatField(), models.FloatField(), models.FloatField())
