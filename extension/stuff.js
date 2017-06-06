function formatDuration(seconds) {
    var date = new Date(null);
    date.setSeconds(seconds);
    return date.toISOString().replace(/.*(\d{2}:\d{2}):.*/, "$1")
}

function formatDurationHuman(seconds) {
    let res = "";

    if (seconds > 60) {
        var date = new Date(null);
        date.setSeconds(seconds);
        res = date.toISOString().replace(/.*(\d{2}:\d{2}):.*/, "$1").replace(":",'h')+'min';

    } else {
        res = "Just started";
    }

    return res;
}

function formatDurationHours(seconds) {
    return Math.round( (seconds/3600)*10 )/10 + "h";
}

function fromDbusFact(fact) {
    // converts a fact coming from dbus into a usable object
    function UTCToLocal(timestamp) {
        // TODO - is this really the way?!
        let res = new Date(timestamp);
        return new Date(res.setUTCMinutes(res.getUTCMinutes() + res.getTimezoneOffset()));
    }

    result = {
        name: fact[4],
        startTime: UTCToLocal(fact[1]*1000),
        endTime: fact[2] != 0 ? UTCToLocal(fact[2]*1000) : null,
        description: fact[3],
        activityId: fact[5],
        category: fact[6],
        tags: fact[7],
        date: UTCToLocal(fact[8] * 1000),
        delta: fact[9], // duration represented in seconds
        id: fact[0]
    };
    return result;
};

function fromDbusFacts(facts) {
    let res = [];
    for (var fact of facts) {
        res.push(fromDbusFact(fact));
    }

    return res;
};


function parseFactString(input) {
    let res = {
        "time": null,
        "activity": input,
        "category": null,
        "description": null,
        "tags": null,
    };
}
