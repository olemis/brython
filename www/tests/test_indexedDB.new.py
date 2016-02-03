from browser import indexedDB

_kids=['Marsha', 'Jan', 'Cindy']

def continue1(event):
    _objectStore.get('Jan', onsuccess=exists, onerror=continue2)

def continue2(event):
    for _kid in _kids:
        _rec={'name': _kid}
        _objectStore.put(_rec, _kid, onsuccess=printmsg, onerror=printerr)

    _objectStore.get('Jan', onsuccess=continue3, onerror=printerr)

def continue3(event):
    print ("Async operations complete..")

def exists(event):
    if event.target.pyresult() is None:
       #handle cause of when get returns undefined if the key doesn't exist
       #in the db..
       continue2(event)
    else:
       print(event.result)
       #this shouldn't get called, output message if called
       print("this shouldn't get called")


def printrec(event):
    _obj=event.target.pyresult()

    assert isinstance(_obj, dict)
    assert _obj['name']=='Jan'

def printmsg(_obj):
    assert _obj in _kids
    print("Added " + _obj)

def onupgradeneeded(e):
    print("event: ", e, "target", e.target)
    print("event type: ",  e.type)

    print("e.oldVersion: ", e.oldVersion)
    print("e.newVersion: ", e.newVersion)

    # todo.. override createObjectStore to take options (ie, like OS.put)
    #e.target.result.createObjectStore("BradyKids")
    db = request.result

    for _kid in _kids:
        print(_kid, db)
        _rec={'name': _kid}
        try:
            with db.put(_rec, _kid) as req:
                printmsg(_kid)
        except Exception as e:
            printerr(e)

def printerr(e):
    print("Error: %s" % (e,))    

db = None
try :
    with indexedDB.open("BradyKids", 3, onupgradeneeded=onupgradeneeded) as request: 
        db = request.result
except Exception as e:
    printerr(e)

print(db)
print("allowing async operations to complete")

