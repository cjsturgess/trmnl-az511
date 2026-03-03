/**
 * get-message.js
 * Given a AZ511 API Key, board ID or lat/lng, returns the corresponding board message.
 */

const { calculateDistance } = require('../../util/calculateDistance');

module.exports = async (req, res) => {
    const api_key = req.query.api_key,
        board_id = req.query.board_id,
        lat_lng = req.query.lat_lng,
        msg_idx = req.query.msg_idx;

    //console.log(req.query);

    /**
     * Parameter Validation
     */
    if (!api_key)
        return res.json({
            "error": "Must provide an AZ511 API key."
        });

    if (!board_id && !lat_lng)
        return res.json({
            "error": "Must provide a board ID or lat/lng."
        });


    /**
     * Fetch AZ511 Message Boards
     */
    const api_response = await fetch(`https://az511.com/api/v2/get/messagesigns?key=${api_key}&format=json`);
    
    if (api_response.status != 200) {
        const api_error = await api_response.text();
        if (api_error.includes("Invalid Key"))
            return res.json({
                "error": "Failed to query the AZ511 API due to an invalid key."
            });
        else
            return res.json({
                "error": "An unknown error occurred whilst querying the AZ511 API."
            });
    }

    let message_boards;
    try {
        message_boards = await api_response.json();
    } catch (e) {
        return res.json({
            "error": "Failed to parse the AZ511 API query response."
        });
    }


    const available_boards = message_boards.filter(x => (x.Messages.length > 0) && (x.Messages[0] != "NO_MESSAGE"));
    let selected_board;

    if (board_id) {
        selected_board = available_boards.filter(x => x.Id === board_id)[0];
    } else {
        loc_parts = lat_lng.split(",");
        if (loc_parts.length < 2)
            return res.json({
                "error": "Both a latitude and longitude must be provided."
            });

        loc_lat = loc_parts[0];
        loc_lng = loc_parts[1];

        const sorted_boards = available_boards.sort((a, b) => {
            const distA = calculateDistance(loc_lat, loc_lng, a.Latitude, a.Longitude);
            const distB = calculateDistance(loc_lat, loc_lng, b.Latitude, b.Longitude);

            a.Distance = distA.toFixed(2);
            b.Distance = distB.toFixed(2);

            return distA - distB;
        });

        selected_board = sorted_boards[0];
    }

    if (!selected_board)
        return res.json({
            "error": "No board found for that filter."
        });

    selected_board.MessagesFormatted = selected_board.Messages.map(x => x.replaceAll("\r\n", "<br>").replaceAll(" ", "&nbsp;"));

    let selected_message = selected_board.MessagesFormatted[Math.floor(Math.random() * selected_board.MessagesFormatted.length)];
    if (msg_idx) {
        if (msg_idx < 0 || msg_idx >= selected_board.MessagesFormatted.length)
            return res.json({
                "error": `Message index must be in range [0, ${selected_board.MessagesFormatted.length}).`
            });

        selected_message = selected_board.MessagesFormatted[msg_idx];
    }

    const message_board = {
        "id": selected_board.Id,
        "name": selected_board.Name,
        "distance": selected_board.Distance,
        "message": selected_message,
        "all_messages": selected_board.MessagesFormatted
    };
    
    //console.log(message_board);
    return res.json({
        "board": message_board
    });
};