/**
 * get-boards.js
 * Given an AZ511 API key, will return a list of all boards for use with the TRMNL configuration dropdown.
 */

module.exports = async (req, res) => {
    let query;
    if (req.body && req.body.query)
        query = req.bpdy.query;

    let api_key;
    if (req.body && req.body.plugin_setting)
        api_key = req.body.plugin_setting.settings_custom_fields_values_api_key;

    /**
     * API Key Validation
     */
    if (!api_key)
        return res.json({
            "error": "Must provide an AZ511 API key."
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


    let available_boards = message_boards;
    if (query) available_boards = available_boards.filter(x => x.Name.toLowerCase().includes(query.toLowerCase()));

    const board_map = available_boards.map(x => {
        return {
            "id": x.Id,
            "name": x.Name
        };
    });

    res.json(board_map);
};