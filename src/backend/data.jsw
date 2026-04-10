import wixData from 'wix-data';

export function getCaseItem() {
    return wixData.query('cases')
        .find()
        .then(results => {
            if (results.items.length > 0) {
                return results.items[0]; // Retorna o primeiro item da coleção
            } else {
                return null;
            }
        })
        .catch(err => {
            console.error(err);
            return null;
        });
}
